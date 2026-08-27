/**
 * @file src/components/selectMenus/helpSelect.js
 * @description Select Menu Handler สำหรับเปลี่ยนหมวดหมู่คำสั่งในเมนู /help
 */

const { generateHelpEmbed, generateHelpComponents } = require('../../utils/helpGenerator');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'help_category_select',

  /**
   * ประมวลผลเมื่อผู้ใช้เลือกหมวดหมู่ใน Dropdown
   * @param {object} interaction - Discord StringSelectMenuInteraction
   * @param {object} client - Discord Client Instance
   */
  async execute(interaction, client) {
    try {
      const selectedCategory = interaction.values[0] || 'overview';
      const member = interaction.member;

      // สร้าง Embed และ Components ใหม่ตามหมวดหมู่ที่เลือก
      const embed = generateHelpEmbed(selectedCategory, member, client);
      const components = generateHelpComponents(member, selectedCategory);

      // อัปเดตข้อความเดิมแบบ In-place
      await interaction.update({
        embeds: [embed],
        components: components
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะเปลี่ยนหมวดหมู่ Help Menu:', error);
    }
  }
};
