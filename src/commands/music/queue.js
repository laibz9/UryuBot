/**
 * @file src/commands/music/queue.js
 * @description Slash Command สำหรับดูรายการคิวเพลงที่กำลังรอเล่น (/queue)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('ดูรายการเพลงทั้งหมดที่กำลังรอเล่นอยู่ในคิว')
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const queue = interaction.client.distube.getQueue(interaction.guildId);

      if (!queue || !queue.songs || queue.songs.length === 0) {
        const errEmbed = createErrorEmbed('ไม่มีคิวเพลง', 'ขณะนี้ไม่มีเพลงที่กำลังเล่นหรือรออยู่ในคิวครับ');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const currentSong = queue.songs[0];
      const upcomingSongs = queue.songs.slice(1, 11);

      let description = `🎶 **กำลังเล่นอยู่:**\n` +
                        `**[${currentSong.name}](${currentSong.url})** (\`${currentSong.formattedDuration}\`) - ขอโดย: ${currentSong.user}\n\n` +
                        `📋 **คิวเพลงถัดไป (${queue.songs.length - 1} เพลง):**\n`;

      if (upcomingSongs.length === 0) {
        description += `*ไม่มีเพลงรอในคิว (พิมพ์ \`/play\` เพื่อเพิ่มเพลง)*`;
      } else {
        upcomingSongs.forEach((s, idx) => {
          description += `\`${idx + 1}.\` **[${s.name.slice(0, 50)}](${s.url})** (\`${s.formattedDuration}\`) | ${s.user}\n`;
        });

        if (queue.songs.length > 11) {
          description += `\n*...และอีก ${queue.songs.length - 11} เพลงในคิว*`;
        }
      }

      const queueEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.guild.name} • Music Queue`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTitle('📜 รายการคิวเพลงปัจจุบัน')
        .setDescription(description)
        .setColor(config.colors.accent)
        .setFooter({
          text: `รวมความยาวคิว: ${queue.formattedDuration} • ระดับเสียง: ${queue.volume}%`,
          iconURL: config.assets.securityIcon
        })
        .setTimestamp();

      await interaction.reply({ embeds: [queueEmbed] });
    } catch (error) {
      const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถดูคิวเพลงได้: \`${error.message}\``);
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
    }
  }
};
