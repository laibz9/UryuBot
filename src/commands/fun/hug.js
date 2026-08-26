/**
 * @file src/commands/fun/hug.js
 * @description Slash Command สำหรับกอดคนอื่นหรือกอดบอทคลายเหงา (/hug)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

const hugGifs = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h2OG8xaDlsNndicmdxcHJxMWVqZmRvaXVzdm90OHl6eHoxNGJmdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lrr9DHuoKCVQTxOhK3/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVvZ2Q4MmlyNWQ4eTB2bmNzaHpocnpvdHFkMnlyOW0zMTN6dzY5ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/od5H3PmEG5EVq/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/phP4p4i1SUtD2/giphy.gif'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('ส่งอ้อมกอดอุ่นๆ ให้เพื่อนหรือกอดบอทคลายเหงา')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการกอด (หากไม่ระบุ บอทจะกอดคุณเอง)')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /hug
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

      let description = '';
      if (!targetUser || targetUser.id === interaction.user.id) {
        description = `🤗 **${interaction.user.username}** ไม่ต้องเหงาไปนะ บอทส่งอ้อมกอดอุ่นๆ ให้กำลังใจคุณเสมอ`;
      } else if (targetUser.id === interaction.client.user.id) {
        description = `🥰 **${interaction.user.username}** เข้ามากอดบอท อบอุ่นจังเลย ขอบคุณนะ`;
      } else {
        description = `🤗 **${interaction.user.username}** ได้ส่งอ้อมกอดสุดอบอุ่นให้แก่ **${targetUser.username}**`;
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Warm Hug Lounge',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/3209/3209849.png'
        })
        .setTitle('🤗 อ้อมกอดคลายเหงา')
        .setDescription(`### ${description}`)
        .setImage(randomGif)
        .setColor('#FF69B4')
        .setFooter({
          text: `ส่งความรู้สึกดีๆ จาก ${interaction.guild.name}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /hug:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการส่งอ้อมกอด', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
