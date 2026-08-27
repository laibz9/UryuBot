/**
 * @file src/commands/general/help.js
 * @description Slash Command /help แสดงคู่มือคำสั่งทั้งหมดแบบ Interactive Dropdown แยกตามสิทธิ์
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { generateHelpEmbed, generateHelpComponents } = require('../../utils/helpGenerator');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 เปิดดูคู่มือและสารบัญคำสั่งทั้งหมดของบอท (แสดงเฉพาะคำสั่งตามสิทธิ์ของคุณ)'),

  category: 'general',

  /**
   * รันคำสั่ง /help
   * @param {object} interaction - Command Interaction Object
   * @param {object} client - Discord Client Instance
   */
  async execute(interaction, client) {
    try {
      const member = interaction.member;

      // สร้าง Embed หน้าหลัก และ Dropdown Menu ที่กรองตามสิทธิ์ของผู้ใช้
      const embed = generateHelpEmbed('overview', member, client);
      const components = generateHelpComponents(member, 'overview');

      // ส่งข้อความแบบ Ephemeral (เห็นเฉพาะผู้พิมพ์) เพื่อไม่ให้รบกวนช่องแชทส่วนรวม
      await interaction.reply({
        embeds: [embed],
        components: components,
        flags: MessageFlags.Ephemeral
      });

      logger.info(`สมาชิก ${interaction.user.tag} เรียกใช้งานคำสั่ง /help ใน ${interaction.guild?.name}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดในการประมวลผลคำสั่ง /help:', error);
      
      const errMsg = { content: 'เกิดข้อผิดพลาดในการเปิดเมนูช่วยเหลือ กรุณาลองใหม่อีกครั้ง', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errMsg).catch(() => {});
      } else {
        await interaction.reply(errMsg).catch(() => {});
      }
    }
  }
};
