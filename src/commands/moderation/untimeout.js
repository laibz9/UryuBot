/**
 * @file src/commands/moderation/untimeout.js
 * @description Slash Command สำหรับยกเลิกการปิดแชทสมาชิกชั่วคราว (/untimeout)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const { resolveTargetUser, resolveTargetMember } = require('../../utils/userResolver');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('ยกเลิกการปิดการใช้งานแชทของสมาชิก (Untimeout / Unmute)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการยกเลิกการปิดแชท')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการยกเลิกการปิดแชท')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /untimeout
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ยศของผู้ใช้
      const hasPerm = await checkCommandPermission(interaction, 'moderator');
      if (!hasPerm) return;

      const targetUser = await resolveTargetUser(interaction, 'user');
      const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
      const guild = interaction.guild;

      // 0. ตรวจสอบว่าระบุผู้ใช้ถูกต้องหรือไม่
      if (!targetUser) {
        const errEmbed = createErrorEmbed('ไม่พบผู้ใช้', 'กรุณาระบุสมาชิกหรือบอทที่ต้องการยกเลิก Timeout ให้ถูกต้อง');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const targetMember = await resolveTargetMember(interaction, targetUser, 'user');

      if (!targetMember) {
        const errEmbed = createErrorEmbed('ไม่พบสมาชิก', 'สมาชิกหรือบอทนี้ไม่ได้อยู่ในเซิร์ฟเวอร์นี้แล้ว');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบว่าสมาชิกโดน Timeout อยู่จริงหรือไม่
      if (!targetMember.isCommunicationDisabled()) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่ได้', `สมาชิก **${targetUser.tag}** ไม่ได้ถูกปิดใช้งานแชทชั่วคราวในขณะนี้`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบสิทธิ์ของบอท
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Moderate Members ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดำเนินการยกเลิก Timeout
      await targetMember.timeout(null, `Untimeout โดย ${interaction.user.tag} | เหตุผล: ${reason}`);

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้ยกเลิก Timeout ให้แก่ ${targetUser.tag} เหตุผล: ${reason}`);

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(guild, {
        action: '🔊 ยกเลิกการปิดแชท (Untimeout Command)',
        target: targetUser,
        moderator: interaction.user,
        reason: reason,
        color: config.colors.success
      });

      const successEmbed = createSuccessEmbed(
        'ยกเลิกการปิดแชทสำเร็จ',
        `ปลดล็อกการใช้งานแชทให้แก่ **${targetUser.tag}** เรียบร้อยแล้ว\n\nเหตุผล: ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /untimeout:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
