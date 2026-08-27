/**
 * @file src/utils/embeds.js
 * @description ยูทิลิตี้สร้าง Discord Embed ดีไซน์สวยงามและสมดุล
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * สร้าง Embed สำหรับแผงควบคุมการยืนยันตัวตน (Verification Panel)
 * @param {object} guild - ข้อมูล Guild/Server เพื่อนำรูปภาพโลโก้มาใช้งาน
 * @returns {EmbedBuilder} Embed Object
 */
function createVerificationEmbed(guild) {
  const iconURL = guild ? guild.iconURL({ dynamic: true, size: 512 }) : config.assets.securityIcon;

  return new EmbedBuilder()
    .setAuthor({
      name: guild ? guild.name : 'Discord Server',
      iconURL: iconURL
    })
    .setTitle('🛡️ ระบบยืนยันตัวตน (Verification)')
    .setDescription(
      'ยินดีต้อนรับสู่เซิร์ฟเวอร์ กรุณากดปุ่ม **ยืนยันตัวตน** ด้านล่าง\n' +
      'และกรอกรหัส CAPTCHA เพื่อรับยศเข้าใช้งาน'
    )
    .setColor(config.colors.accent)
    .setThumbnail(iconURL)
    .setImage(config.assets.verifyBanner)
    .setFooter({
      text: 'Verification System',
      iconURL: config.assets.securityIcon
    })
    .setTimestamp();
}

/**
 * สร้าง Embed ตอบกลับสถานะสำเร็จ (Success Embed)
 * @param {string} title - หัวข้อ Embed
 * @param {string} description - รายละเอียด Embed
 * @returns {EmbedBuilder} Embed Object
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(config.colors.success)
    .setThumbnail(config.assets.successGif)
    .setFooter({
      text: 'System Notification',
      iconURL: config.assets.securityIcon
    })
    .setTimestamp();
}

/**
 * สร้าง Embed ตอบกลับสถานะผิดพลาด (Error Embed)
 * @param {string} title - หัวข้อ Embed
 * @param {string} description - รายละเอียด Embed
 * @returns {EmbedBuilder} Embed Object
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(config.colors.danger)
    .setThumbnail(config.assets.errorGif)
    .setFooter({
      text: 'System Notification',
      iconURL: config.assets.securityIcon
    })
    .setTimestamp();
}

/**
 * สร้าง Embed สำหรับต้อนรับสมาชิกใหม่เข้าเซิร์ฟเวอร์ (Welcome Embed)
 * @param {object} member - Discord GuildMember Object
 * @returns {EmbedBuilder} Embed Object
 */
function createWelcomeEmbed(member) {
  const guild = member.guild;
  const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 512 });

  return new EmbedBuilder()
    .setAuthor({
      name: `${guild.name} • Welcome`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle('👋 ยินดีต้อนรับสมาชิกใหม่!')
    .setDescription(
      `ยินดีต้อนรับ ${member} สู่ **${guild.name}**\n` +
      `คุณคือสมาชิกลำดับที่ **#${guild.memberCount}**\n\n` +
      `📌 กรุณาไปยังห้องยืนยันตัวตนเพื่อรับยศและเข้าถึงช่องสนทนาทั้งหมด`
    )
    .setColor(config.colors.accent)
    .setThumbnail(avatarURL)
    .setImage(config.assets.welcomeBanner)
    .setFooter({
      text: 'Member Joined',
      iconURL: avatarURL
    })
    .setTimestamp();
}

/**
 * สร้าง Embed สำหรับแจ้งสมาชิกออกจากเซิร์ฟเวอร์ (Goodbye Embed)
 * @param {object} user - Discord User Object
 * @param {number} remainingCount - จำนวนสมาชิกที่เหลือในเซิร์ฟเวอร์
 * @param {object} guild - Discord Guild Object
 * @returns {EmbedBuilder} Embed Object
 */
function createGoodbyeEmbed(user, remainingCount, guild) {
  const avatarURL = user.displayAvatarURL({ dynamic: true, size: 512 });

  return new EmbedBuilder()
    .setAuthor({
      name: `${guild.name} • Goodbye`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle('👋 สมาชิกออกจากเซิร์ฟเวอร์')
    .setDescription(
      `**${user.tag}** ได้ออกจากเซิร์ฟเวอร์แล้ว\n` +
      `👥 สมาชิกคงเหลือทั้งหมด **${remainingCount}** คน`
    )
    .setColor(config.colors.danger)
    .setThumbnail(avatarURL)
    .setImage(config.assets.goodbyeBanner)
    .setFooter({
      text: 'Member Left',
      iconURL: avatarURL
    })
    .setTimestamp();
}

/**
 * สร้าง Embed สำหรับแผงเปิดตั๋ว Support Ticket
 * @param {object} guild - ข้อมูล Guild/Server
 * @returns {EmbedBuilder} Embed Object
 */
function createTicketPanelEmbed(guild) {
  const iconURL = guild ? guild.iconURL({ dynamic: true, size: 512 }) : config.assets.securityIcon;

  return new EmbedBuilder()
    .setAuthor({
      name: guild ? `${guild.name} • Help & Support` : 'Help & Support',
      iconURL: iconURL
    })
    .setTitle('🎫 ศูนย์บริการและติดต่อทีมงาน (Support Ticket)')
    .setDescription(
      'หากคุณต้องการความช่วยเหลือ แจ้งปัญหา พบข้อผิดพลาด หรือติดต่อสอบถามเรื่องต่างๆ\n\n' +
      '📌 **ขั้นตอนการเปิดตั๋ว:**\n' +
      '1. กดปุ่ม **"📩 เปิดตั๋วติดต่อทีมงาน"** ด้านล่าง\n' +
      '2. ระบบจะสร้างห้องแชทส่วนตัวสำหรับคุณโดยเฉพาะ\n' +
      '3. พิมพ์รายละเอียดเรื่องที่ต้องการสอบถามและรอทีมงานตอบกลับ'
    )
    .setColor(config.colors.accent || '#06b6d4')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3209/3209849.png')
    .setFooter({
      text: 'Ticket Support System',
      iconURL: config.assets.securityIcon
    })
    .setTimestamp();
}

module.exports = {
  createTicketPanelEmbed,
  createVerificationEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createWelcomeEmbed,
  createGoodbyeEmbed
};
