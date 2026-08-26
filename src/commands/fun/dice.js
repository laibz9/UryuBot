/**
 * @file src/commands/fun/dice.js
 * @description Slash Command สำหรับทอยลูกเต๋าสุ่มแต้ม (/dice)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('ทอยลูกเต๋าสุ่มแต้ม (1 ถึง 6 หรือกำหนดจำนวนหน้าได้)')
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('จำนวนหน้าของลูกเต๋า (ค่าเริ่มต้น: 6 หน้า)')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /dice
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const sides = interaction.options.getInteger('sides') || 6;
      const rollResult = Math.floor(Math.random() * sides) + 1;
      const percentage = ((rollResult / sides) * 100).toFixed(0);

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Dice Roller Arena',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/867/867912.png'
        })
        .setTitle('🎲 ผลการทอยลูกเต๋า')
        .setDescription(
          `ลูกเต๋า **D${sides}** หมุนกลิ้งบนโต๊ะ...\n\n` +
          `# 🎯 ได้แต้ม: **${rollResult}** / ${sides}\n\n` +
          `> ระดับแต้ม: **${percentage}%** ของค่าสูงสุด`
        )
        .setThumbnail('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzRyaWRpM3cxeTN1OW42bXBxczBmaG1xZ3hrcXNvemdva3I1ZWF2OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setColor(config.colors.accent)
        .setFooter({
          text: `Rolled by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /dice:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการทอยลูกเต๋า', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
