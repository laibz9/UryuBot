/**
 * @file src/utils/auditLogger.js
 * @description ยูทิลิตี้สำหรับส่งบันทึกกิจกรรมและการกระทำของผู้ดูแลระบบ (Audit & Mod Action Logger)
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildSettings } = require('../database/db');
const config = require('../config/config');
const logger = require('./logger');

/**
 * ค้นหาช่องบันทึกประวัติ (Log Channel) ของเซิร์ฟเวอร์
 * @param {object} guild - Discord Guild Object
 * @returns {object|null} GuildTextChannel หรือ null หากไม่พบ
 */
function getLogChannel(guild) {
  if (!guild) return null;
  const settings = getGuildSettings(guild.id);
  if (!settings.enableLogSystem) return null;

  // 1. ค้นหาจาก logChannelId ในฐานข้อมูล / config
  if (settings.logChannelId) {
    const channel = guild.channels.cache.get(settings.logChannelId);
    if (channel) return channel;
  }

  // 2. ค้นหาช่องที่มีคำว่า log / bot-logs / บันทึก
  return guild.channels.cache.find(
    c => c.type === ChannelType.GuildText &&
         (c.name.includes('log') || c.name.includes('บันทึก'))
  ) || null;
}

/**
 * ส่ง Embed บันทึกประวัติไปยังช่อง Log
 * @param {object} guild - Discord Guild Object
 * @param {EmbedBuilder} embed - Discord EmbedBuilder
 */
async function sendAuditLog(guild, embed) {
  try {
    const logChannel = getLogChannel(guild);
    if (!logChannel) return;

    const botMember = guild.members.me;
    const permissions = logChannel.permissionsFor(botMember);

    if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return;
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการส่ง Audit Log:', error);
  }
}

/**
 * ส่งบันทึกการกระทำของผู้ดูแลระบบ (Mod Action Log) เช่น เตะ แบน ปิดแชท ลบข้อความ
 * @param {object} guild - Discord Guild Object
 * @param {object} data - ข้อมูลการกระทำ { action, target, moderator, reason, details, color }
 */
async function sendModActionLog(guild, { action, target, moderator, reason, details = [], color = config.colors.warning }) {
  try {
    const targetTag = target ? (target.tag || target.user?.tag || target.name || `${target}`) : 'ไม่ระบุ';
    const targetAvatar = target?.displayAvatarURL ? target.displayAvatarURL({ dynamic: true }) : null;
    const modTag = moderator ? (moderator.tag || moderator.user?.tag || `${moderator}`) : 'ระบบอัตโนมัติ';

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `🛡️ การดำเนินการ: ${action}`,
        iconURL: targetAvatar || guild.iconURL({ dynamic: true })
      })
      .setColor(color)
      .addFields(
        { name: '🎯 สมาชิกเป้าหมาย', value: target ? `${target} (\`${target.id || targetTag}\`)` : 'ไม่ระบุ', inline: true },
        { name: '👮 ดำเนินการโดย', value: moderator ? `${moderator} (\`${modTag}\`)` : 'ระบบ', inline: true },
        { name: '📌 เหตุผล', value: reason || 'ไม่ได้ระบุเหตุผล', inline: false }
      )
      .setFooter({
        text: `Mod Action • ${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    // เพิ่มฟิลด์รายละเอียดเพิ่มเติมถ้ามี
    if (details && details.length > 0) {
      details.forEach(field => {
        embed.addFields(field);
      });
    }

    await sendAuditLog(guild, embed);
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการส่ง Mod Action Log:', error);
  }
}

module.exports = {
  getLogChannel,
  sendAuditLog,
  sendModActionLog
};
