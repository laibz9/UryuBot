/**
 * @file src/events/guild/guildMemberRemove.js
 * @description Event Handler เมื่อมีสมาชิกออกจากเซิร์ฟเวอร์ (guildMemberRemove)
 */

const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createGoodbyeEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,

  /**
   * ประมวลผลเมื่อมีสมาชิกออกจากเซิร์ฟเวอร์
   * @param {object} member - Discord GuildMember Object
   */
  async execute(member) {
    try {
      // 0. ตรวจสอบว่าระบบบอกลาถูกเปิดใช้งานอยู่หรือไม่
      if (!config.bot.enableWelcomeSystem) {
        return;
      }

      const guild = member.guild;
      let goodbyeChannel = null;

      // 1. ค้นหาช่องแจ้งคนออกจาก GOODBYE_CHANNEL_ID หรือ WELCOME_CHANNEL_ID ใน .env
      if (config.bot.goodbyeChannelId) {
        goodbyeChannel = guild.channels.cache.get(config.bot.goodbyeChannelId);
      } else if (config.bot.welcomeChannelId) {
        goodbyeChannel = guild.channels.cache.get(config.bot.welcomeChannelId);
      }

      // 2. หากไม่ได้ตั้งค่าใน .env ค้นหาช่องอัตโนมัติ (goodbye/leave/welcome)
      if (!goodbyeChannel) {
        goodbyeChannel = guild.systemChannel || guild.channels.cache.find(
          c => c.type === ChannelType.GuildText && 
               (c.name.includes('goodbye') || c.name.includes('leave') || c.name.includes('welcome') || c.name.includes('general'))
        );
      }

      if (!goodbyeChannel) {
        logger.warn(`ไม่พบช่องสำหรับส่งข้อความบอกลาในเซิร์ฟเวอร์ ${guild.name}`);
        return;
      }

      // 3. ตรวจสอบสิทธิ์การส่งข้อความของบอทในช่องเป้าหมาย
      const permissions = goodbyeChannel.permissionsFor(guild.members.me);
      if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        logger.warn(`บอทไม่มีสิทธิ์ส่ง Embed ในช่อง ${goodbyeChannel.name} ของเซิร์ฟเวอร์ ${guild.name}`);
        return;
      }

      // 4. สร้างและส่ง Embed บอกลา
      const goodbyeEmbed = createGoodbyeEmbed(member.user, guild.memberCount, guild);

      await goodbyeChannel.send({
        embeds: [goodbyeEmbed]
      });

      logger.info(`ส่งข้อความบอกลาสมาชิก ${member.user.tag} ในเซิร์ฟเวอร์ ${guild.name} สำเร็จ`);

      // 5. ตรวจสอบว่าเป็นการเตะโดย Admin/Mod หรือไม่เพื่อบันทึก Log
      if (config.bot.enableLogSystem && guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const auditLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: 20 // AuditLogEvent.MemberKick
          });
          const kickLog = auditLogs.entries.first();

          if (kickLog && kickLog.target?.id === member.id && (Date.now() - kickLog.createdTimestamp < 10000)) {
            const { sendModActionLog } = require('../../utils/auditLogger');
            await sendModActionLog(guild, {
              action: '👢 เตะสมาชิกออกจากเซิร์ฟเวอร์ (Member Kicked)',
              target: member.user,
              moderator: kickLog.executor,
              reason: kickLog.reason || 'ไม่ได้ระบุเหตุผล',
              color: config.colors.danger
            });
          }
        } catch {}
      }
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะส่งข้อความบอกลาสมาชิก:', error);
    }
  }
};
