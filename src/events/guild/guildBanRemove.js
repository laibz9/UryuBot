/**
 * @file src/events/guild/guildBanRemove.js
 * @description Event Handler เมื่อมีการปลดแบนสมาชิกในเซิร์ฟเวอร์ (guildBanRemove)
 */

const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildBanRemove,
  once: false,

  /**
   * ประมวลผลเมื่อสมาชิกถูกปลดแบน
   * @param {object} ban - Discord GuildBan Object
   */
  async execute(ban) {
    try {
      const guild = ban.guild;
      const targetUser = ban.user;

      let moderator = 'ไม่ทราบผู้ดำเนินการ';
      let reason = 'ปลดแบนสมาชิก';

      // พยายามดึง Audit Log เพื่อหาตัว Admin/Mod ที่เป็นคนปลดแบน
      if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const auditLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanRemove
          });
          const unbanLog = auditLogs.entries.first();

          if (unbanLog && unbanLog.target?.id === targetUser.id && (Date.now() - unbanLog.createdTimestamp < 10000)) {
            moderator = unbanLog.executor;
            if (unbanLog.reason) reason = unbanLog.reason;
          }
        } catch {
          // หากดึง Audit Log ไม่ได้
        }
      }

      await sendModActionLog(guild, {
        action: '🔓 ปลดแบนสมาชิก (Member Unbanned)',
        target: targetUser,
        moderator: moderator,
        reason: reason,
        color: config.colors.success
      });

      logger.info(`บันทึก Log การปลดแบนสมาชิก: ${targetUser.tag} ในเซิร์ฟเวอร์ ${guild.name}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน guildBanRemove event:', error);
    }
  }
};
