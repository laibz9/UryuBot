/**
 * @file src/commands/fun/joke.js
 * @description Slash Command สำหรับสุ่มมุกตลกและมุกหยอดคลายเหงา (/joke)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

const funnyJokes = [
  'A: วันก่อนครับ...\nB: ทำไมครับ?\nA: เดินไปเจอคนขายไก่ย่าง บอกขอไก่ย่างตัวนึง พอเค้าสับไก่ให้...\nB: โดนบาดมือ?\nA: เปล่า ไก่ร้องว่า "โอ๊ย เจ็บ!"',
  'A: รู้ไหมว่าปลาอะไรไม่มีก้าง?\nB: ปลาทู?\nA: เปล่า... ปลาป่น!',
  'A: รู้ไหมว่าคอมพิวเตอร์ชอบกินอะไรมากที่สุด?\nB: ไวรัส?\nA: เปล่า... ขนมปัง (Breadcrumbs)!',
  'A: ทำไมไก่ถึงต้องข้ามถนน?\nB: ไปหาของกิน?\nA: เปล่า... ข้ามไปอยู่อีกฝั่งนึง!',
  'A: ยามอะไรตื่นเช้าที่สุด?\nB: ยามเช้า?\nA: เปล่า... ยามตีสี่!'
];

const flirtJokes = [
  'เธอรู้ไหมว่าเธอเหมือนพัดลมนะ เพราะพออยู่ใกล้ทีไร หัวใจมันพัดหวิวทุกทีเลย',
  'ขอยืมโทรศัพท์เธอหน่อยสิ จะโทรไปบอกแม่ว่าเจอเนื้อคู่แล้ว',
  'เธอไม่ต้องใส่น้ำตาลในกาแฟหรอก แค่เธอยิ้มให้ กาแฟก็หวานเจี๊ยบแล้ว',
  'ถึงเราจะไม่ใช่ Google แต่เธอก็คือทุกอย่างที่เรากำลังค้นหานะ',
  'ช่วงนี้ตาสั้นจังเลย มองไม่เห็นใครนอกจากเธอคนเดียวเลยเนี่ย'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('สุ่มมุกตลกหรือมุกหยอดคลายเหงา')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('ประเภทมุกที่คุณอยากอ่าน')
        .setRequired(false)
        .addChoices(
          { name: '🤣 มุกตลกคลายเครียด', value: 'joke' },
          { name: '💖 มุกหยอดคลายเหงา', value: 'flirt' }
        )
    ),

  /**
   * ประมวลผลคำสั่ง /joke
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const type = interaction.options.getString('type') || 'joke';
      const isFlirt = type === 'flirt';
      const jokeList = isFlirt ? flirtJokes : funnyJokes;
      const randomJoke = jokeList[Math.floor(Math.random() * jokeList.length)];
      
      const title = isFlirt ? '💖 มุกหยอดชวนยิ้ม' : '🤣 มุกตลกคลายเครียด';
      const authorName = isFlirt ? 'Romance & Sweet Lounge' : 'Comedy & Smile Lounge';
      const icon = isFlirt 
        ? 'https://cdn-icons-png.flaticon.com/512/833/833472.png'
        : 'https://cdn-icons-png.flaticon.com/512/742/742751.png';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: authorName,
          iconURL: icon
        })
        .setTitle(title)
        .setDescription(`> *${randomJoke}*`)
        .setThumbnail(icon)
        .setColor(isFlirt ? '#FF1493' : '#F1C40F')
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /joke:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการเล่ามุก', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
