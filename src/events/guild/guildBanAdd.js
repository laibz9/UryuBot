/**
 * @file src/events/guild/guildBanAdd.js
 * @description Event Handler เมื่อมีสมาชิกถูกแบนออกจากเซิร์ฟเวอร์ (guildBanAdd)
 */

const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildBanAdd,
  once: false,

  /**
   * ประมวลผลเมื่อสมาชิกถูกแบน
   * @param {object} ban - Discord GuildBan Object
   */
  async execute(ban) {
    try {
      const guild = ban.guild;
      const targetUser = ban.user;

      let moderator = 'ไม่ทราบผู้ดำเนินการ';
      let reason = ban.reason || 'ไม่ได้ระบุเหตุผล';

      // พยายามดึง Audit Log เพื่อหาตัว Admin/Mod ที่เป็นคนสั่งแบน
      if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const auditLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanAdd
          });
          const banLog = auditLogs.entries.first();

          if (banLog && banLog.target?.id === targetUser.id && (Date.now() - banLog.createdTimestamp < 10000)) {
            moderator = banLog.executor;
            if (banLog.reason) reason = banLog.reason;
          }
        } catch {
          // หากดึง Audit Log ไม่ได้
        }
      }

      await sendModActionLog(guild, {
        action: '🔨 แบนสมาชิก (Member Banned)',
        target: targetUser,
        moderator: moderator,
        reason: reason,
        color: config.colors.danger
      });

      logger.info(`บันทึก Log การแบนสมาชิก: ${targetUser.tag} ในเซิร์ฟเวอร์ ${guild.name}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน guildBanAdd event:', error);
    }
  }
};
