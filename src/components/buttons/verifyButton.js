/**
 * @file src/components/buttons/verifyButton.js
 * @description Button Handler เมื่อกดปุ่ม "✅ ยืนยันตัวตน (Verify)" (customId: btn_verify)
 */

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../../config/config');
const { generateCaptcha } = require('../../utils/captcha');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'btn_verify',

  /**
   * ประมวลผลเมื่อผู้ใช้กดปุ่ม Verify
   * @param {object} interaction - ButtonInteraction Object
   */
  async execute(interaction) {
    try {
      const member = interaction.member;
      const verifiedRoleId = config.bot.verifiedRoleId;

      // 1. ตรวจสอบว่าผู้ใช้มียศยืนยันตัวตนแล้วหรือไม่
      if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
        return await interaction.reply({
          content: config.messages.alreadyVerified,
          flags: MessageFlags.Ephemeral
        });
      }

      // 2. สุ่มรหัส CAPTCHA ความยาว 6 ตัวอักษร
      const captchaCode = generateCaptcha();

      // 3. สร้าง Modal สำหรับให้ผู้ใช้กรอก CAPTCHA
      // ฝากค่า captchaCode ไว้ใน customId ของ Modal ในรูปแบบ modal_verify:CAPTCHA_CODE
      const modal = new ModalBuilder()
        .setCustomId(`modal_verify:${captchaCode}`)
        .setTitle('ระบบยืนยันตัวตน');

      // สร้างช่องกรอกข้อความ (TextInput)
      const captchaInput = new TextInputBuilder()
        .setCustomId('captcha_input')
        .setLabel(`กรุณากรอกรหัส: ${captchaCode}`) // แสดงรหัส CAPTCHA ใน Label
        .setPlaceholder(`พิมพ์รหัส ${captchaCode} ที่นี่ (ตัวพิมพ์ใหญ่ทั้งหมด)`) // แสดงตัวอย่างใน Placeholder
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(captchaInput);
      modal.addComponents(actionRow);

      // 4. แสดงหน้าต่าง Modal ให้ผู้ใช้กรอก
      await interaction.showModal(modal);
      logger.info(`แสดงหน้าต่าง CAPTCHA Modal (${captchaCode}) ให้แก่ผู้ใช้: ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`เกิดข้อผิดพลาดในการประมวลผล verifyButton สำหรับ ${interaction.user.tag}:`, error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: config.messages.genericError,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
