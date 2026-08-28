/**
 * @file src/commands/fun/fortune.js
 * @description Slash Command สำหรับเซียมซีทำนายดวงประจำวัน (/fortune)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

const fortunes = [
  {
    grade: '🧧 มหาโชค มหาลาภ (Great Blessing)',
    stars: '⭐⭐⭐⭐⭐',
    description: 'วันนี้เป็นวันทองของคุณ หยิบจับสิ่งใดก็ราบรื่นและประสบความสำเร็จ มีเกณฑ์ได้รับโชคลาภหรือข่าวดีที่ไม่คาดฝัน',
    color: '#FFD700'
  },
  {
    grade: '✨ ดวงดี มีโชคลาภ (Good Fortune)',
    stars: '⭐⭐⭐⭐',
    description: 'การงานและการเรียนราบรื่น มีคนคอยสนับสนุนช่วยเหลือ ความรักสดใสและมีความเข้าใจซึ่งกันและกัน',
    color: '#2ECC71'
  },
  {
    grade: '🌤️ ดวงปานกลาง ราบรื่น (Calm & Peaceful)',
    stars: '⭐⭐⭐',
    description: 'ทุกอย่างดำเนินไปอย่างราบรื่น สบายๆ ไม่มีเรื่องหนักใจ เหมาะกับการพักผ่อนและทำกิจกรรมที่ชอบ',
    color: '#3498DB'
  },
  {
    grade: '⚠️ ควรระมัดระวัง (Caution Needed)',
    stars: '⭐⭐',
    description: 'อาจมีเรื่องจุกจิกให้ต้องแก้ไขเล็กน้อย ใช้สติและความใจเย็นในการตัดสินใจ แล้วทุกอย่างจะผ่านไปด้วยดี',
    color: '#E67E22'
  }
];

const colorsList = ['ชมพูพาสเทล', 'ฟ้าคราม', 'ส้มสว่าง', 'เขียวมรกต', 'ม่วงลาเวนเดอร์', 'ทองอร่าม'];
const luckyItems = ['พวงกุญแจนำโชค', 'แก้วกาแฟใบโปรด', 'หูฟังคู่ใจ', 'ปากกาสีน้ำเงิน', 'เสื้อโทนสีมงคล'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fortune')
    .setDescription('เขย่าเซียมซีทำนายดวงประจำวัน (โชคลาภ, เลขเด็ด, สีมงคล)')
    .setDMPermission(false),

  /**
   * ประมวลผลคำสั่ง /fortune
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const pick = fortunes[Math.floor(Math.random() * fortunes.length)];
      const luckyNumber = Math.floor(Math.random() * 90) + 10;
      const luckyColor = colorsList[Math.floor(Math.random() * colorsList.length)];
      const luckyItem = luckyItems[Math.floor(Math.random() * luckyItems.length)];

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Daily Fortune Shrine',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/3209/3209994.png'
        })
        .setTitle('🎋 ใบเซียมซีทำนายดวงประจำวัน')
        .setDescription(
          `### ${pick.grade}\n` +
          `**ระดับความมงคล:** ${pick.stars}\n\n` +
          `> *${pick.description}*`
        )
        .addFields(
          { name: '🔢 เลขมงคล', value: `\`${luckyNumber}\``, inline: true },
          { name: '🎨 สีนำโชค', value: `\`${luckyColor}\``, inline: true },
          { name: '🎁 ไอเทมนำโชค', value: `\`${luckyItem}\``, inline: true }
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3209/3209994.png')
        .setColor(pick.color)
        .setFooter({
          text: `ทำนายดวงของ ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /fortune:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการทำนายเซียมซี', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
