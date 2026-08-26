const {
  Events,
  EmbedBuilder,
  AuditLogEvent,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const { isDedicatedMusicChannel } = require('../../utils/musicManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  once: false,

  /**
   * ประมวลผลเมื่อข้อความถูกลบ
   * @param {object} message - Discord Message Object
   */
  async execute(message) {
    try {
      // 0. ตรวจสอบเงื่อนไขเบื้องต้น (อยู่ในเซิร์ฟเวอร์, ข้ามข้อความบอท และข้ามห้องขอเพลง)
      if (!message.guild || (message.author && message.author.bot)) return;
      if (!config.bot.enableLogSystem) return;
      if (isDedicatedMusicChannel(message.channel)) return;

      // หากเป็นข้อความที่ไม่สมบูรณ์ (Partial) ให้ลอง Fetch เพื่อตรวจว่าเจ้าของเป็นบอทหรือไม่
      if (message.partial) {
        try {
          await message.fetch();
          if (message.author?.bot) return;
        } catch {}
      }

      const guild = message.guild;
      let logChannel = null;

      // 1. ค้นหาช่อง Log จาก LOG_CHANNEL_ID ใน .env
      if (config.bot.logChannelId) {
        logChannel = guild.channels.cache.get(config.bot.logChannelId);
      }

      // 2. หากไม่ได้ตั้งค่า ให้ค้นหาช่องที่ชื่อขึ้นต้นด้วย log / bot-logs / บันทึก
      if (!logChannel) {
        logChannel = guild.channels.cache.find(
          c => c.type === ChannelType.GuildText &&
               (c.name.includes('log') || c.name.includes('บันทึก'))
        );
      }

      if (!logChannel) return;

      // 3. ตรวจสอบสิทธิ์ของบอทในช่อง Log
      const botPermissions = logChannel.permissionsFor(guild.members.me);
      if (!botPermissions || !botPermissions.has(PermissionFlagsBits.SendMessages) || !botPermissions.has(PermissionFlagsBits.EmbedLinks)) {
        return;
      }

      // 4. พยายามตรวจสอบ Audit Log เพื่อหาตัวผู้ลบ
      let executor = 'เจ้าของข้อความ (ลบเอง)';
      if (guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const fetchedLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MessageDelete
          });
          const deletionLog = fetchedLogs.entries.first();

          if (deletionLog) {
            const { target, executor: logExecutor, createdTimestamp } = deletionLog;
            // ตรวจสอบว่า Audit Log เกิดขึ้นภายใน 5 วินาทีที่ผ่านมา และ target ตรงกับผู้ส่งข้อความ
            if (target.id === message.author?.id && (Date.now() - createdTimestamp < 5000)) {
              executor = `${logExecutor} (${logExecutor.tag})`;
            }
          }
        } catch {
          // หากดึง Audit Log ไม่ได้ ให้ใช้ค่าเริ่มต้น
        }
      }

      const content = message.content ? message.content.slice(0, 1000) : 'ไม่มีข้อความ (อาจเป็นรูปภาพ, ไฟล์ หรือ Embed)';
      const authorTag = message.author ? message.author.tag : 'ไม่ทราบผู้ส่ง';
      const authorAvatar = message.author ? message.author.displayAvatarURL({ dynamic: true }) : guild.iconURL({ dynamic: true });

      // 5. สร้าง Embed แจ้งเตือนข้อความถูกลบ
      const embed = new EmbedBuilder()
        .setAuthor({
          name: authorTag,
          iconURL: authorAvatar
        })
        .setTitle('🗑️ ข้อความถูกลบ (Message Deleted)')
        .setColor(config.colors.danger)
        .addFields(
          { name: '💬 ช่องที่เกิดเหตุ', value: `${message.channel}`, inline: true },
          { name: '👤 ผู้ส่งข้อความ', value: message.author ? `${message.author}` : 'ไม่ทราบ', inline: true },
          { name: '🛡️ ดำเนินการโดย', value: `${executor}`, inline: true },
          { name: '📝 เนื้อหาข้อความที่ถูกลบ', value: `\`\`\`\n${content}\n\`\`\``, inline: false }
        )
        .setFooter({
          text: `Message ID: ${message.id} • ${guild.name}`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
      logger.info(`บันทึก Log ข้อความถูกลบในช่อง #${message.channel.name} ของเซิร์ฟเวอร์ ${guild.name}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน messageDelete event:', error);
    }
  }
};
