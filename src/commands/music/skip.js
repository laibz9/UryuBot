/**
 * @file src/commands/music/skip.js
 * @description Slash Command สำหรับข้ามเพลงปัจจุบัน (/skip)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('ข้ามเพลงที่กำลังเล่นอยู่ไปยังเพลงถัดไปในคิว')
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue || !queue.songs || queue.songs.length === 0) {
        const errEmbed = createErrorEmbed('ไม่มีเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ในคิวครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const memberVoice = interaction.member?.voice?.channel;
      if (!memberVoice || memberVoice.id !== queue.voiceChannel.id) {
        const errEmbed = createErrorEmbed('ห้องเสียงไม่ตรงกัน', 'คุณต้องอยู่ในห้องเสียงเดียวกับบอทเพื่อควบคุมเพลง');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      if (queue.songs.length <= 1 && !queue.autoplay) {
        await queue.stop();
        return await interaction.reply({ content: '⏹️ ข้ามเพลงสุดท้ายและหยุดเล่นเพลงเรียบร้อยแล้ว' });
      }

      const song = await queue.skip();
      logger.info(`ข้ามเพลงสำเร็จในเซิร์ฟเวอร์ ${interaction.guild.name}`);
      await interaction.reply({ content: `⏭️ ข้ามเพลงเรียบร้อย! กำลังเล่นเพลงถัดไป: **${song.name}**` });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /skip:', error);
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถข้ามเพลงได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
