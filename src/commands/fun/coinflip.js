/**
 * @file src/commands/fun/coinflip.js
 * @description Slash Command สำหรับเสี่ยงทายทอยเหรียญ หัว/ก้อย (/coinflip)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

const coinFlipGif = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('ทอยเหรียญสุ่มเสี่ยงทาย (หัว หรือ ก้อย)')
    .setDMPermission(false),

  /**
   * ประมวลผลคำสั่ง /coinflip
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const isHeads = Math.random() < 0.5;
      const resultText = isHeads ? '🟡 หัว (HEADS)' : '⚪ ก้อย (TAILS)';
      const coinIcon = isHeads 
        ? 'https://cdn-icons-png.flaticon.com/512/217/217853.png'
        : 'https://cdn-icons-png.flaticon.com/512/217/217852.png';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Coin Flip Challenge',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/217/217853.png'
        })
        .setTitle('🪙 ผลการทอยเหรียญ')
        .setDescription(
          `เหรียญหมุนติ้วในอากาศแล้วตกลงมาที่...\n\n` +
          `# ${resultText}\n\n` +
          `*โอกาสออก: 50.0% • สุ่มโดยระบบอัตโนมัติ*`
        )
        .setThumbnail(coinIcon)
        .setColor(isHeads ? '#F1C40F' : '#BDC3C7')
        .setFooter({
          text: `Flipped by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /coinflip:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการทอยเหรียญ', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
