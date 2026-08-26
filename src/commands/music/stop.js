/**
 * @file src/commands/music/stop.js
 * @description Slash Command สำหรับหยุดเล่นเพลงและออกจากห้องเสียง (/stop)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('หยุดเล่นเพลง ล้างคิวเพลงทั้งหมด และออกจากห้องเสียง')
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue) {
        const errEmbed = createErrorEmbed('ไม่ได้เล่นเพลง', 'ขณะนี้บอทไม่ได้อยู่ในห้องเสียงหรือไม่มีเพลงกำลังเล่นครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await queue.stop();
      updateDedicatedMusicPanel(interaction.guild, null, null);
      await interaction.reply({ content: '⏹️ หยุดการเล่นเพลง ล้างคิว และออกจากห้องเสียงเรียบร้อยแล้วครับ' });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถหยุดเล่นเพลงได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
