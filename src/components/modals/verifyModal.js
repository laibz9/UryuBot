/**
 * @file src/components/modals/verifyModal.js
 * @description Modal Handler เมื่อผู้ใช้ส่งข้อมูลรหัส CAPTCHA (customId: modal_verify)
 */

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../config/config');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'modal_verify',

  /**
   * ประมวลผลเมื่อผู้ใช้กด Submit Modal ยืนยันตัวตน
   * @param {object} interaction - ModalSubmitInteraction Object
   */
  async execute(interaction) {
    try {
      // 1. ดึงรหัส CAPTCHA ที่คาดหวังจาก customId (รูปแบบ modal_verify:CAPTCHA_CODE)
      const customIdParts = interaction.customId.split(':');
      const expectedCaptcha = customIdParts[1];

      // 2. ดึงรหัสที่ผู้ใช้พิมพ์กรอกเข้ามา
      const userInput = interaction.fields.getTextInputValue('captcha_input');

      // 3. ตรวจสอบความถูกต้องของรหัส CAPTCHA (เปรียบเทียบแบบไม่สนใจตัวพิมพ์เล็ก/ใหญ่ และตัดช่องว่าง)
      const isMatch = userInput && expectedCaptcha && (userInput.trim().toUpperCase() === expectedCaptcha.trim().toUpperCase());

      if (!isMatch) {
        logger.warn(`ผู้ใช้ ${interaction.user.tag} พิมพ์ CAPTCHA ผิด (กรอก: "${userInput}" | คาดหวัง: "${expectedCaptcha}")`);
        
        const errorEmbed = createErrorEmbed(
          'ยืนยันตัวตนไม่สำเร็จ',
          config.messages.captchaIncorrect
        );

        return await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral
        });
      }

      // 4. หาก CAPTCHA ถูกต้อง ดำเนินการตรวจสอบ Defensive Checks ก่อนแจกยศ
      const guild = interaction.guild;
      const member = interaction.member;
      const { getGuildSettings } = require('../../database/db');
      const settings = getGuildSettings(guild.id);
      const verifiedRoleId = settings.verifiedRoleId || config.bot.verifiedRoleId;

      // 4.1 ตรวจสอบการตั้งค่า VERIFIED_ROLE_ID
      if (!verifiedRoleId) {
        logger.error('ยังไม่ได้ตั้งค่า VERIFIED_ROLE_ID ใน MySQL หรือ .env');
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', 'ยังไม่ได้ตั้งค่ายศยืนยันตัวตนในระบบ (กรุณาตั้งค่าผ่าน Web Dashboard หรือ /setup-roles)');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 4.2 ตรวจสอบว่ามียศนี้อยู่ในเซิร์ฟเวอร์จริงหรือไม่
      const targetRole = guild.roles.cache.get(verifiedRoleId);
      if (!targetRole) {
        logger.error(`ไม่พบบทบาท (Role ID: ${verifiedRoleId}) ในเซิร์ฟเวอร์ ${guild.name}`);
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.roleNotFound);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 4.3 ตรวจสอบสิทธิ์ของบอท (Permission Check: Manage Roles)
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        logger.error(`บอทขาดสิทธิ์ Manage Roles ในเซิร์ฟเวอร์ ${guild.name}`);
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', config.messages.missingBotPermission);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 4.4 ตรวจสอบลำดับยศ (Role Hierarchy Check)
      if (botMember.roles.highest.position <= targetRole.position) {
        logger.error(`ลำดับยศของบอท (${botMember.roles.highest.name}) อยู่ต่ำกว่าหรือเท่ากับยศที่จะแจก (${targetRole.name})`);
        const errEmbed = createErrorEmbed('ลำดับยศไม่ถูกต้อง', config.messages.roleHierarchyError);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 5. เพิ่ม Role ให้ผู้ใช้
      await member.roles.add(targetRole);
      logger.success(`เพิ่มยศ "${targetRole.name}" ให้แก่ผู้ใช้ ${interaction.user.tag} สำเร็จ`);

      // 6. ส่ง Embed ตอบกลับสถานะสำเร็จแบบ Ephemeral
      const successEmbed = createSuccessEmbed(
        'ยืนยันตัวตนสำเร็จ',
        `${config.messages.verifySuccess}\n\nคุณได้รับยศ **${targetRole.name}** เรียบร้อยแล้ว`
      );

      await interaction.reply({
        embeds: [successEmbed],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      logger.error(`เกิดข้อผิดพลาดในการประมวลผล verifyModal สำหรับ ${interaction.user.tag}:`, error);

      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({
          embeds: [errEmbed],
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
