/**
 * @file src/commands/moderation/timeout.js
 * @description Slash Command สำหรับปิดการใช้งานแชทสมาชิกชั่วคราว (/timeout)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('ปิดการใช้งานแชทของสมาชิกชั่วคราว (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการปิดการใช้งานแชท')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('ระยะเวลาในการปิดแชทชั่วคราว')
        .setRequired(true)
        .addChoices(
          { name: '1 นาที', value: 60 * 1000 },
          { name: '5 นาที', value: 5 * 60 * 1000 },
          { name: '10 นาที', value: 10 * 60 * 1000 },
          { name: '1 ชั่วโมง', value: 60 * 60 * 1000 },
          { name: '1 วัน', value: 24 * 60 * 60 * 1000 },
          { name: '1 สัปดาห์', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการปิดการใช้งานแชท')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /timeout
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ยศของผู้ใช้
      const hasPerm = await checkCommandPermission(interaction, 'moderator');
      if (!hasPerm) return;

      let targetUser = interaction.options.getUser('user') || interaction.options.getMember('user')?.user;
      const rawValue = interaction.options.get('user')?.value;

      if (!targetUser && rawValue) {
        targetUser = await interaction.client.users.fetch(rawValue).catch(() => null);
      }

      const durationMs = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
      const guild = interaction.guild;
      const executor = interaction.member;

      // 0. ตรวจสอบว่าระบุผู้ใช้ถูกต้องหรือไม่
      if (!targetUser) {
        const errEmbed = createErrorEmbed('ไม่พบผู้ใช้', 'กรุณาระบุสมาชิกหรือบอทที่ต้องการ Timeout ให้ถูกต้อง');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 1. ตรวจสอบการลงโทษตัวเอง
      if (targetUser.id === interaction.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetSelf);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 2. ตรวจสอบการลงโทษบอทตัวเอง
      if (targetUser.id === interaction.client.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetBot);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const targetMember = interaction.options.getMember('user') || await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        const errEmbed = createErrorEmbed('ไม่พบสมาชิก', 'ผู้ใช้งานนี้ไม่ได้อยู่ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 3. ตรวจสอบสิทธิ์ของบอท
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Moderate Members ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 4. ตรวจสอบลำดับยศของบอทกับเป้าหมาย
      if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
        const errEmbed = createErrorEmbed('ลำดับยศไม่เพียงพอ', config.messages.roleHierarchyError);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 5. ตรวจสอบลำดับยศของผู้ใช้กับเป้าหมาย
      if (guild.ownerId !== executor.id && executor.roles.highest.position <= targetMember.roles.highest.position) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', config.messages.userHierarchyError);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดำเนินการ Timeout
      await targetMember.timeout(durationMs, `Timeout โดย ${interaction.user.tag} | เหตุผล: ${reason}`);

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้ Timeout สมาชิก ${targetUser.tag} ระยะเวลา: ${durationMs / 1000} วินาที เหตุผล: ${reason}`);

      const durationMinutes = durationMs / (60 * 1000);
      const durationDisplay = durationMinutes >= 60 * 24 
        ? `${durationMinutes / (60 * 24)} วัน` 
        : durationMinutes >= 60 
          ? `${durationMinutes / 60} ชั่วโมง` 
          : `${durationMinutes} นาที`;

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(guild, {
        action: '⏳ ปิดแชทชั่วคราว (Timeout Command)',
        target: targetUser,
        moderator: interaction.user,
        reason: reason,
        details: [
          { name: '⏰ ระยะเวลา', value: `${durationDisplay}`, inline: true }
        ],
        color: config.colors.warning
      });

      const successEmbed = createSuccessEmbed(
        'ปิดการใช้งานแชทชั่วคราวสำเร็จ',
        `ปิดการใช้งานแชทของ **${targetUser.tag}** เป็นเวลา **${durationDisplay}** เรียบร้อยแล้ว\n\nเหตุผล: ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /timeout:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
