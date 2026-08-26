/**
 * @file src/commands/music/resume.js
 * @description Slash Command สำหรับเล่นเพลงต่อหลังจากพักชั่วคราว (/resume)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('เล่นเพลงต่อหลังจากที่ถูกพักไว้')
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue || !queue.songs || queue.songs.length === 0) {
        const errEmbed = createErrorEmbed('ไม่มีเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      if (!queue.paused) {
        return await interaction.reply({ content: '▶️ เพลงกำลังเล่นอยู่แล้วครับ', flags: MessageFlags.Ephemeral });
      }

      queue.resume();
      updateDedicatedMusicPanel(interaction.guild, queue, queue.songs[0]);
      await interaction.reply({ content: '▶️ เล่นเพลงต่อเรียบร้อยแล้ว' });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถเล่นเพลงต่อได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
