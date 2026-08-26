/**
 * @file src/utils/permissions.js
 * @description ยูทิลิตี้สำหรับตรวจสอบสิทธิ์ของสมาชิกด้วย Role IDs และ Discord Permissions
 */

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config/config');
const { createErrorEmbed } = require('./embeds');

/**
 * ตรวจสอบว่าสมาชิกมียศ Admin หรือสิทธิ์ระดับ Administrator/Owner หรือไม่
 * @param {object} member - GuildMember Object
 * @returns {boolean} true หากมียศ Admin หรือเป็นเจ้าของเซิร์ฟเวอร์
 */
function isAdmin(member) {
  if (!member || !member.guild) return false;

  // 1. เจ้าของเซิร์ฟเวอร์ (Server Owner) มียศสูงสุดเสมอ
  if (member.guild.ownerId === member.id) return true;

  // 2. มียศตาม LEADER_ROLE_ID หรือ ADMIN_ROLE_ID ใน .env หรือไม่
  if (
    (config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId)) ||
    (config.bot.adminRoleId && member.roles.cache.has(config.bot.adminRoleId))
  ) {
    return true;
  }

  // 3. มีสิทธิ์ระดับ Administrator หรือ ManageGuild หรือไม่
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  return false;
}

/**
 * ตรวจสอบว่าสมาชิกมียศ Moderator หรือมียศสูงกว่าหรือไม่
 * @param {object} member - GuildMember Object
 * @returns {boolean} true หากมียศ Moderator, Admin หรือเป็นเจ้าของเซิร์ฟเวอร์
 */
function isModerator(member) {
  if (!member || !member.guild) return false;

  // หากเป็น Admin อยู่แล้วให้ผ่านทันที
  if (isAdmin(member)) return true;

  // มียศตาม MODERATOR_ROLE_ID ใน .env หรือไม่
  if (config.bot.moderatorRoleId && member.roles.cache.has(config.bot.moderatorRoleId)) {
    return true;
  }

  // มีสิทธิ์ระดับ Moderate Members, Kick Members หรือ Ban Members หรือไม่
  if (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers)
  ) {
    return true;
  }

  return false;
}

/**
 * ตรวจสอบสิทธิ์และตอบกลับข้อความแจ้งเตือนอัตโนมัติหากสิทธิ์ไม่เพียงพอ
 * @param {object} interaction - CommandInteraction Object
 * @param {'admin'|'moderator'} requiredLevel - ระดับสิทธิ์ที่ต้องการ ('admin' หรือ 'moderator')
 * @returns {Promise<boolean>} returns true หากสิทธิ์ผ่าน และ false หากสิทธิ์ไม่ผ่าน (พร้อมส่ง Embed ตอบกลับแล้ว)
 */
async function checkCommandPermission(interaction, requiredLevel = 'moderator') {
  const member = interaction.member;

  let hasPermission = false;

  if (requiredLevel === 'admin') {
    hasPermission = isAdmin(member);
  } else if (requiredLevel === 'moderator') {
    hasPermission = isModerator(member);
  }

  if (!hasPermission) {
    const roleTypeName = requiredLevel === 'admin' ? 'Admin' : 'Moderator / Admin';
    const errEmbed = createErrorEmbed(
      'สิทธิ์ไม่เพียงพอ (Access Denied)',
      `คำสั่งนี้อนุญาตให้ใช้งานได้เฉพาะสมาชิกมียศ **${roleTypeName}** หรือมีสิทธิ์ผู้ดูแลระบบเท่านั้น`
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    return false;
  }

  return true;
}

module.exports = {
  isAdmin,
  isModerator,
  checkCommandPermission
};
