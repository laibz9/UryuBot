/**
 * @file src/commands/moderation/ban.js
 * @description Slash Command สำหรับแบนสมาชิกออกจากเซิร์ฟเวอร์ (/ban)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('แบนสมาชิกออกจากเซิร์ฟเวอร์ (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการแบนออกจากเซิร์ฟเวอร์')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการแบนออกจากเซิร์ฟเวอร์')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_messages')
        .setDescription('ลบประวัติข้อความย้อนหลัง (วินาที)')
        .setRequired(false)
        .addChoices(
          { name: 'ไม่ลบข้อความ', value: 0 },
          { name: 'ย้อนหลัง 24 ชั่วโมง (1 วัน)', value: 86400 },
          { name: 'ย้อนหลัง 7 วัน', value: 604800 }
        )
    ),

  /**
   * ประมวลผลคำสั่ง /ban
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ยศของผู้ใช้
      const hasPerm = await checkCommandPermission(interaction, 'admin');
      if (!hasPerm) return;

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
      const deleteMessageSeconds = interaction.options.getInteger('delete_messages') || 0;
      const guild = interaction.guild;
      const executor = interaction.member;

      // 1. ตรวจสอบว่าพยายามแบนตัวเองหรือไม่
      if (targetUser.id === interaction.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetSelf);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 2. ตรวจสอบว่าพยายามแบนบอทหรือไม่
      if (targetUser.id === interaction.client.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetBot);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบสิทธิ์ของบอท (Bot Permission Check)
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Ban Members ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบข้อมูล GuildMember (ถ้าอยู่ในเซิร์ฟเวอร์)
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

      if (targetMember) {
        // ตรวจสอบลำดับยศของบอทกับเป้าหมาย
        if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
          const errEmbed = createErrorEmbed('ลำดับยศไม่เพียงพอ', config.messages.roleHierarchyError);
          return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
        }

        // ตรวจสอบลำดับยศของผู้ใช้กับเป้าหมาย
        if (guild.ownerId !== executor.id && executor.roles.highest.position <= targetMember.roles.highest.position) {
          const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', config.messages.userHierarchyError);
          return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
        }
      }

      // ดำเนินการแบนสมาชิก
      await guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteMessageSeconds,
        reason: `แบนโดย ${interaction.user.tag} | เหตุผล: ${reason}`
      });

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้แบนสมาชิก ${targetUser.tag} (ID: ${targetUser.id}) เหตุผล: ${reason}`);

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(guild, {
        action: '🔨 แบนสมาชิก (Ban Command)',
        target: targetUser,
        moderator: interaction.user,
        reason: reason,
        color: config.colors.danger
      });

      const successEmbed = createSuccessEmbed(
        'แบนสมาชิกสำเร็จ',
        `แบนสมาชิก **${targetUser.tag}** ออกจากเซิร์ฟเวอร์เรียบร้อยแล้ว\n\nเหตุผล: ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /ban:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
