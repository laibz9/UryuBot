/**
 * @file src/commands/moderation/kick.js
 * @description Slash Command สำหรับเตะสมาชิกออกจากเซิร์ฟเวอร์ (/kick)
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('เตะสมาชิกออกจากเซิร์ฟเวอร์ (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการเตะออกจากเซิร์ฟเวอร์')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการเตะออกจากเซิร์ฟเวอร์')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /kick
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

      const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
      const guild = interaction.guild;
      const executor = interaction.member;

      // 0. ตรวจสอบว่าระบุผู้ใช้ถูกต้องหรือไม่
      if (!targetUser) {
        const errEmbed = createErrorEmbed('ไม่พบผู้ใช้', 'กรุณาระบุสมาชิกหรือบอทที่ต้องการเตะให้ถูกต้อง');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 1. ตรวจสอบว่าพยายามเตะตัวเองหรือไม่
      if (targetUser.id === interaction.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetSelf);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 2. ตรวจสอบว่าพยายามเตะบอทตัวเองหรือไม่
      if (targetUser.id === interaction.client.user.id) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่สำเร็จ', config.messages.cannotTargetBot);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดึงข้อมูล GuildMember ของเป้าหมาย
      const targetMember = interaction.options.getMember('user') || await guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        const errEmbed = createErrorEmbed('ไม่พบสมาชิก', 'สมาชิกหรือบอทนี้ไม่ได้อยู่ในเซิร์ฟเวอร์นี้แล้ว');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 3. ตรวจสอบสิทธิ์ของบอท (Bot Permission Check)
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทไม่มีสิทธิ์ Kick Members ในเซิร์ฟเวอร์นี้');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 4. ตรวจสอบลำดับยศของบอทกับเป้าหมาย (Bot Hierarchy Check)
      if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
        const errEmbed = createErrorEmbed('ลำดับยศไม่เพียงพอ', config.messages.roleHierarchyError);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 5. ตรวจสอบลำดับยศของผู้ใช้กับเป้าหมาย (User Hierarchy Check - ยกเว้นเจ้าของเซิร์ฟเวอร์)
      if (guild.ownerId !== executor.id && executor.roles.highest.position <= targetMember.roles.highest.position) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', config.messages.userHierarchyError);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 6. ดำเนินการเตะสมาชิก
      await targetMember.kick(`เตะโดย ${interaction.user.tag} | เหตุผล: ${reason}`);

      logger.info(`ผู้ดูแลระบบ ${interaction.user.tag} ได้เตะสมาชิก ${targetUser.tag} (ID: ${targetUser.id}) เหตุผล: ${reason}`);

      // ส่งบันทึกไปยัง Audit Log
      const { sendModActionLog } = require('../../utils/auditLogger');
      await sendModActionLog(guild, {
        action: '👢 เตะสมาชิก (Kick Command)',
        target: targetUser,
        moderator: interaction.user,
        reason: reason,
        color: config.colors.danger
      });

      const successEmbed = createSuccessEmbed(
        'เตะสมาชิกสำเร็จ',
        `เตะสมาชิก **${targetUser.tag}** ออกจากเซิร์ฟเวอร์เรียบร้อยแล้ว\n\nเหตุผล: ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /kick:', error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
