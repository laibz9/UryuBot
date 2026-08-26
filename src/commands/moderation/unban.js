/**
 * @file src/commands/moderation/unban.js
 * @description Slash Command สำหรับปลดแบนผู้ใช้งานออกจากเซิร์ฟเวอร์ด้วย User ID (/unban)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('ปลดแบนผู้ใช้งานออกจากเซิร์ฟเวอร์ด้วย User ID (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('User ID ของผู้ใช้งานที่ต้องการปลดแบน')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการปลดแบน')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /unban
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ยศของผู้ใช้
      const hasPerm = await checkCommandPermission(interaction, 'admin');
      if (!hasPerm) return;

      const userId = interaction.options.getString('user_id').trim();
      const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
      const guild = interaction.guild;

      // ตรวจสอบสิทธิ์ของบอท
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Ban Members ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบว่าผู้ใช้งานโดนแบนอยู่จริงหรือไม่
      const banInfo = await guild.bans.fetch(userId).catch(() => null);

      if (!banInfo) {
        const errEmbed = createErrorEmbed('ไม่พบรายการแบน', `ไม่พบรายการแบนสำหรับ User ID: **${userId}** ในเซิร์ฟเวอร์นี้`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดำเนินการปลดแบน
      await guild.members.unban(userId, `ปลดแบนโดย ${interaction.user.tag} | เหตุผล: ${reason}`);

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้ปลดแบน User ID: ${userId} (${banInfo.user.tag}) เหตุผล: ${reason}`);

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(guild, {
        action: '🔓 ปลดแบนสมาชิก (Unban Command)',
        target: banInfo.user,
        moderator: interaction.user,
        reason: reason,
        color: config.colors.success
      });

      const successEmbed = createSuccessEmbed(
        'ปลดแบนสำเร็จ',
        `ปลดแบนผู้ใช้งาน **${banInfo.user.tag}** (ID: \`${userId}\`) เรียบร้อยแล้ว\n\nเหตุผล: ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /unban:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
