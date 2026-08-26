/**
 * @file src/commands/music/loop.js
 * @description Slash Command สำหรับตั้งค่าโหมดเล่นเพลงวนซ้ำ (/loop)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('ตั้งค่าโหมดเล่นวนซ้ำ (ปิด / วนซ้ำเพลงนี้ / วนซ้ำทั้งคิว)')
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('mode')
        .setDescription('เลือกโหมดวนซ้ำ')
        .setRequired(true)
        .addChoices(
          { name: '❌ ปิดการวนซ้ำ (Off)', value: 0 },
          { name: '🔂 วนซ้ำเพลงปัจจุบัน (Repeat Song)', value: 1 },
          { name: '🔁 วนซ้ำทั้งคิวเพลง (Repeat Queue)', value: 2 }
        )
    ),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue) {
        const errEmbed = createErrorEmbed('ไม่มีเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const mode = interaction.options.getInteger('mode');
      queue.setRepeatMode(mode);

      const modeNames = ['❌ ปิดการวนซ้ำ', '🔂 วนซ้ำเพลงปัจจุบัน', '🔁 วนซ้ำทั้งคิวเพลง'];
      updateDedicatedMusicPanel(interaction.guild, queue, queue.songs[0]);

      await interaction.reply({ content: `🔁 ตั้งค่าโหมดวนซ้ำเป็น: **${modeNames[mode]}** เรียบร้อยแล้วครับ` });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถตั้งค่าโหมดวนซ้ำได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
