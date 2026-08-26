/**
 * @file src/events/guild/guildMemberUpdate.js
 * @description Event Handler เมื่อข้อมูลหรือยศของสมาชิกมีการเปลี่ยนแปลง (guildMemberUpdate) เช่น การ Timeout หรือการให้/ลดยศ
 */

const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  once: false,

  /**
   * ประมวลผลเมื่อสมาชิกมีการอัปเดตสถานะหรือยศ
   * @param {object} oldMember - GuildMember ก่อนอัปเดต
   * @param {object} newMember - GuildMember หลังอัปเดต
   */
  async execute(oldMember, newMember) {
    try {
      const guild = newMember.guild;
      if (!guild || newMember.user.bot) return;
      if (!config.bot.enableLogSystem) return;

      // 1. ตรวจสอบการเพิ่มหรือยกเลิก Timeout (Communication Disabled)
      const wasTimedOut = oldMember.isCommunicationDisabled();
      const isTimedOut = newMember.isCommunicationDisabled();

      if (!wasTimedOut && isTimedOut) {
        // โดน Timeout
        const timeoutUntil = newMember.communicationDisabledUntilTimestamp;
        let moderator = 'ไม่ทราบผู้ดำเนินการ';
        let reason = 'ไม่ได้ระบุเหตุผล';

        if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          try {
            const auditLogs = await guild.fetchAuditLogs({
              limit: 1,
              type: AuditLogEvent.MemberUpdate
            });
            const entry = auditLogs.entries.first();
            if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 10000)) {
              moderator = entry.executor;
              if (entry.reason) reason = entry.reason;
            }
          } catch {}
        }

        await sendModActionLog(guild, {
          action: '⏳ ปิดแชทชั่วคราว (Member Timeout)',
          target: newMember.user,
          moderator: moderator,
          reason: reason,
          details: [
            {
              name: '⏰ ระยะเวลาสิ้นสุด',
              value: `<t:${Math.floor(timeoutUntil / 1000)}:F> (<t:${Math.floor(timeoutUntil / 1000)}:R>)`,
              inline: false
            }
          ],
          color: config.colors.warning
        });
      } else if (wasTimedOut && !isTimedOut) {
        // ยกเลิก Timeout
        let moderator = 'ไม่ทราบผู้ดำเนินการ';
        let reason = 'ยกเลิกการปิดแชท';

        if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          try {
            const auditLogs = await guild.fetchAuditLogs({
              limit: 1,
              type: AuditLogEvent.MemberUpdate
            });
            const entry = auditLogs.entries.first();
            if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 10000)) {
              moderator = entry.executor;
              if (entry.reason) reason = entry.reason;
            }
          } catch {}
        }

        await sendModActionLog(guild, {
          action: '🔊 ยกเลิกการปิดแชท (Member Untimeout)',
          target: newMember.user,
          moderator: moderator,
          reason: reason,
          color: config.colors.success
        });
      }

      // 2. ตรวจสอบการเปลี่ยนแปลงยศ (Roles Added / Removed)
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
      const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        let moderator = 'ไม่ทราบผู้ดำเนินการ (อาจเป็นบอทหรือแอดมิน)';
        if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
          try {
            const auditLogs = await guild.fetchAuditLogs({
              limit: 1,
              type: AuditLogEvent.MemberRoleUpdate
            });
            const entry = auditLogs.entries.first();
            if (entry && entry.target?.id === newMember.id && (Date.now() - entry.createdTimestamp < 10000)) {
              moderator = entry.executor;
            }
          } catch {}
        }

        if (addedRoles.size > 0) {
          const roleList = addedRoles.map(r => r.toString()).join(', ');
          await sendModActionLog(guild, {
            action: '🏷️ มอบยศแก่สมาชิก (Role Added)',
            target: newMember.user,
            moderator: moderator,
            reason: `ได้รับยศ: ${roleList}`,
            color: config.colors.info
          });
        }

        if (removedRoles.size > 0) {
          const roleList = removedRoles.map(r => r.toString()).join(', ');
          await sendModActionLog(guild, {
            action: '🗑️ ลดยศของสมาชิก (Role Removed)',
            target: newMember.user,
            moderator: moderator,
            reason: `ถูกลดยศ: ${roleList}`,
            color: config.colors.warning
          });
        }
      }
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน guildMemberUpdate event:', error);
    }
  }
};
