/**
 * @file src/commands/fun/8ball.js
 * @description Slash Command สำหรับถามลูกแก้วทำนาย 8-Ball (/8ball)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const responses = [
  { text: 'แน่นอนที่สุดอย่างไร้ข้อกังขา', type: 'positive', color: '#57F287' },
  { text: 'สัญญาณทุกอย่างชี้ชัดว่า "ใช่"', type: 'positive', color: '#57F287' },
  { text: 'มีโอกาสสูงมากที่จะสำเร็จ', type: 'positive', color: '#57F287' },
  { text: 'ผลลัพธ์ดูสดใสและเป็นใจมาก', type: 'positive', color: '#57F287' },
  { text: 'คำตอบยังคลุมเครือ ลองถามใหม่อีกครั้ง', type: 'neutral', color: '#FEE75C' },
  { text: 'ตั้งสมาธิให้ดี แล้วลองถามใหม่อีกรอบ', type: 'neutral', color: '#FEE75C' },
  { text: 'ตอนนี้ยังไม่เหมาะที่จะบอกคำตอบ', type: 'neutral', color: '#FEE75C' },
  { text: 'อย่าเพิ่งคาดหวังสูงในตอนนี้', type: 'negative', color: '#ED4245' },
  { text: 'คำตอบคือ "ไม่" อย่างแน่นอน', type: 'negative', color: '#ED4245' },
  { text: 'ดูเหมือนว่าโอกาสจะน้อยมาก', type: 'negative', color: '#ED4245' },
  { text: 'แหล่งข้อมูลบอกว่าอย่าเพิ่งทำเลย', type: 'negative', color: '#ED4245' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('ถามลูกแก้วพยากรณ์ 8-Ball เพื่อทำนายคำตอบ')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('คำถามที่คุณต้องการคำตอบ')
        .setRequired(true)
    ),

  /**
   * ประมวลผลคำสั่ง /8ball
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const question = interaction.options.getString('question');
      const pick = responses[Math.floor(Math.random() * responses.length)];

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Magic 8-Ball Oracle',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/2362/2362879.png'
        })
        .setTitle('🔮 ลูกแก้วพยากรณ์ 8-Ball')
        .setColor(pick.color)
        .setThumbnail('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWc1bXFwNzB1c2Qzb3N4NGQ1bjZ0bXdxZ3hhb2tzZ3Z4a2pldWZ3ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26xBI73gWquCBBCDe/giphy.gif')
        .addFields(
          { name: 'คำถามที่ถาม', value: `> *${question}*`, inline: false },
          { name: 'คำทำนายของลูกแก้ว', value: `### ${pick.text}`, inline: false }
        )
        .setFooter({
          text: `ทำนายให้ ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /8ball:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการทำนาย', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
