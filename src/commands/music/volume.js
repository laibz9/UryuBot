/**
 * @file src/commands/music/volume.js
 * @description Slash Command สำหรับปรับระดับความดังของเพลง (/volume)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('ปรับระดับความดังเสียงของเพลง (1 - 100%)')
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('percent')
        .setDescription('เปอร์เซ็นต์ระดับเสียง (1 - 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue) {
        const errEmbed = createErrorEmbed('ไม่มีเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const percent = interaction.options.getInteger('percent');
      queue.setVolume(percent);
      updateDedicatedMusicPanel(interaction.guild, queue, queue.songs[0]);

      await interaction.reply({ content: `🔊 ปรับระดับเสียงเป็น **${percent}%** เรียบร้อยแล้วครับ` });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถปรับระดับเสียงได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
