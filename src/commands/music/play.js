/**
 * @file src/commands/music/play.js
 * @description Slash Command สำหรับค้นหาและเล่นเพลง (/play)
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('ค้นหาและเล่นเพลงจาก YouTube, Spotify หรือ SoundCloud')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('song')
        .setDescription('ชื่อเพลง หรือ ลิงก์ URL (YouTube, Spotify, SoundCloud)')
        .setRequired(true)
    ),

  /**
   * ประมวลผลคำสั่ง /play
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        const errEmbed = createErrorEmbed(
          'ไม่ได้อยู่ในห้องเสียง',
          'กรุณาเชื่อมต่อห้องเสียง (Voice Channel) ก่อนใช้คำสั่งเล่นเพลงครับ'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const songQuery = interaction.options.getString('song');
      await interaction.deferReply();

      logger.info(`คำสั่ง /play: "${songQuery}" โดย ${interaction.user.tag}`);

      await interaction.client.distube.play(voiceChannel, songQuery, {
        member: member,
        textChannel: interaction.channel
      });

      await interaction.editReply({
        content: `🔍 กำลังค้นหาและดึงเพลง: **"${songQuery}"** เข้าคิว...`
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /play:', error);
      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถเล่นเพลงได้: \`${error.message || 'Error'}\``);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
