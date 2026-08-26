/**
 * @file src/commands/moderation/clear.js
 * @description Slash Command สำหรับลบข้อความในช่องแชทจำนวนมาก (/clear)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('ลบข้อความในช่องแชทจำนวนมาก (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('จำนวนข้อความที่ต้องการลบ (1-100 ข้อความ)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  /**
   * ประมวลผลคำสั่ง /clear
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ยศของผู้ใช้
      const hasPerm = await checkCommandPermission(interaction, 'moderator');
      if (!hasPerm) return;

      const amount = interaction.options.getInteger('amount');
      const channel = interaction.channel;

      // ตรวจสอบสิทธิ์ของบอท
      const botMember = interaction.guild.members.me;
      if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Manage Messages ในช่องนี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดำเนินการลบข้อความ (filterOld = true เพื่อกรองข้อความที่อายุเกิน 14 วันออกอัตโนมัติ)
      const deletedMessages = await channel.bulkDelete(amount, true);

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้ลบข้อความจำนวน ${deletedMessages.size} ข้อความในช่อง #${channel.name}`);

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(interaction.guild, {
        action: '🧹 ล้างข้อความจำนวนมาก (Bulk Message Clear)',
        target: { tag: `#${channel.name}`, id: channel.id },
        moderator: interaction.user,
        reason: `ลบข้อความจำนวน ${deletedMessages.size} ข้อความในช่อง ${channel}`,
        color: config.colors.warning
      });

      const successEmbed = createSuccessEmbed(
        'ลบข้อความสำเร็จ',
        `ลบข้อความในช่อง ${channel} จำนวน **${deletedMessages.size}** ข้อความเรียบร้อยแล้ว` +
        (deletedMessages.size < amount ? '\n*(ข้อความที่มีอายุเกิน 14 วันจะไม่สามารถลบด้วยคำสั่งนี้ได้)*' : '')
      );

      await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /clear:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
