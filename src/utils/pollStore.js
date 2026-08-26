/**
 * @file src/utils/pollStore.js
 * @description ตัวจัดเก็บและจัดการข้อมูลการโหวตโพลสำรวจความคิดเห็น (Poll Store & Progress Bar Renderer)
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

// In-Memory Map เก็บข้อมูลโพลตาม Message ID
const polls = new Map();

/**
 * สร้าง Progress Bar กราฟิกแสดงเปอร์เซ็นต์ (ความยาว 10 ช่อง)
 * @param {number} percentage - ค่าเปอร์เซ็นต์ (0 - 100)
 * @returns {string} เช่น "████████░░"
 */
function generateProgressBar(percentage) {
  const totalBars = 10;
  const filledBars = Math.round((percentage / 100) * totalBars);
  const emptyBars = totalBars - filledBars;

  return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

/**
 * บันทึกโพลใหม่เข้า Store
 * @param {string} messageId - ID ข้อความ Discord ที่เป็นโพล
 * @param {object} data - ข้อมูลโพล { question, options, authorId, authorTag, authorAvatar, createdAt }
 */
function createPoll(messageId, data) {
  polls.set(messageId, {
    question: data.question,
    options: data.options.map(opt => ({
      text: opt,
      votes: new Set() // Set เก็บ User IDs ที่โหวตตัวเลือกนี้
    })),
    authorId: data.authorId,
    authorTag: data.authorTag,
    authorAvatar: data.authorAvatar,
    createdAt: data.createdAt || Date.now()
  });
}

/**
 * ดึงข้อมูลโพลตาม Message ID
 * @param {string} messageId - ID ข้อความ
 * @returns {object|null} ข้อมูลโพล
 */
function getPoll(messageId) {
  return polls.get(messageId) || null;
}

/**
 * บันทึกหรือเปลี่ยนผลการโหวตของผู้ใช้
 * @param {string} messageId - ID ข้อความ
 * @param {string} userId - ID ของผู้ใช้ที่โหวต
 * @param {number} optionIndex - ลำดับของตัวเลือกที่โหวต (0-based)
 * @returns {object|null} ข้อมูลผลลัพธ์ { optionText, isChanged } หรือ null หากไม่พบโพล
 */
function castVote(messageId, userId, optionIndex) {
  const poll = polls.get(messageId);
  if (!poll || !poll.options[optionIndex]) return null;

  let isChanged = false;

  // ลบโหวตเดิมของผู้ใช้ในทุกตัวเลือกออกก่อน (เพื่อให้ 1 คนมี 1 สิทธิ์)
  for (let i = 0; i < poll.options.length; i++) {
    if (poll.options[i].votes.has(userId)) {
      poll.options[i].votes.delete(userId);
      if (i !== optionIndex) isChanged = true;
    }
  }

  // เพิ่มโหวตใหม่
  poll.options[optionIndex].votes.add(userId);

  return {
    optionText: poll.options[optionIndex].text,
    isChanged
  };
}

/**
 * สร้าง Embed แสดงผลคะแนนโพลแบบ Realtime พร้อมกราฟิก Progress Bar
 * @param {object} poll - ข้อมูลโพล
 * @param {object} guild - Discord Guild Object
 * @returns {EmbedBuilder} Embed Object
 */
function renderPollEmbed(poll, guild) {
  // คำนวณจำนวนโหวตทั้งหมด
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.size, 0);

  const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  let description = `### ❓ ${poll.question}\n\n`;

  poll.options.forEach((opt, index) => {
    const voteCount = opt.votes.size;
    const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(0) : 0;
    const bar = generateProgressBar(percentage);
    const emoji = emojiNumbers[index] || '🔹';

    description += `${emoji} **${opt.text}**\n` +
                   `\`${bar}\` **${percentage}%** (${voteCount} โหวต)\n\n`;
  });

  description += `━━━━━━━━━━━━━━━━━━━━━\n` +
                 `👥 **จำนวนผู้ลงคะแนนทั้งหมด:** \`${totalVotes}\` คน\n` +
                 `💡 *กดปุ่มด้านล่างเพื่อลงคะแนนโหวต (สามารถเปลี่ยนโหวตได้ตลอดเวลา)*`;

  return new EmbedBuilder()
    .setAuthor({
      name: `${guild.name} • โพลสำรวจความคิดเห็น`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle('📊 แบบสำรวจความคิดเห็น (Community Poll)')
    .setDescription(description)
    .setColor(config.colors.accent)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3209/3209849.png')
    .setFooter({
      text: `สร้างโพลโดย ${poll.authorTag}`,
      iconURL: poll.authorAvatar
    })
    .setTimestamp(poll.createdAt);
}

module.exports = {
  createPoll,
  getPoll,
  castVote,
  renderPollEmbed,
  generateProgressBar
};
