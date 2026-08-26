/**
 * @file src/commands/music/pause.js
 * @description Slash Command สำหรับพักการเล่นเพลงชั่วคราว (/pause)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('พักการเล่นเพลงปัจจุบันชั่วคราว')
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue || !queue.songs || queue.songs.length === 0) {
        const errEmbed = createErrorEmbed('ไม่มีเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      if (queue.paused) {
        return await interaction.reply({ content: '⏸️ เพลงถูกพักไว้อยู่แล้วครับ (พิมพ์ `/resume` เพื่อเล่นต่อ)', flags: MessageFlags.Ephemeral });
      }

      queue.pause();
      updateDedicatedMusicPanel(interaction.guild, queue, queue.songs[0]);
      await interaction.reply({ content: '⏸️ พักการเล่นเพลงชั่วคราวเรียบร้อยแล้ว' });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถพักเพลงได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
