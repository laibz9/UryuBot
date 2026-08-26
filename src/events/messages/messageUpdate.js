const {
  Events,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const { isDedicatedMusicChannel } = require('../../utils/musicManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.MessageUpdate,
  once: false,

  /**
   * ประมวลผลเมื่อข้อความถูกแก้ไข
   * @param {object} oldMessage - Discord Message Object ก่อนแก้ไข
   * @param {object} newMessage - Discord Message Object หลังแก้ไข
   */
  async execute(oldMessage, newMessage) {
    try {
      // 0. ตรวจสอบเงื่อนไขเบื้องต้น (อยู่ในเซิร์ฟเวอร์, ไม่ใช่ข้อความบอท, และไม่ใช่ห้องขอเพลง)
      if (!newMessage.guild) return;
      if (newMessage.author?.bot || oldMessage.author?.bot) return;
      if (!config.bot.enableLogSystem) return;
      if (isDedicatedMusicChannel(newMessage.channel)) return;

      // ป้องกันการยิง log หากเนื้อหาเท่าเดิม (เช่น การโหลด Embed Link Preview)
      if (oldMessage.content === newMessage.content) return;
      if (!oldMessage.content && !newMessage.content) return;

      const guild = newMessage.guild;
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

      const beforeContent = oldMessage.content ? oldMessage.content.slice(0, 1000) : '*(ไม่สามารถอ่านเนื้อหาก่อนหน้าได้)*';
      const afterContent = newMessage.content ? newMessage.content.slice(0, 1000) : '*(ไม่มีข้อความ)*';
      const authorTag = newMessage.author ? newMessage.author.tag : 'ไม่ทราบผู้ส่ง';
      const authorAvatar = newMessage.author ? newMessage.author.displayAvatarURL({ dynamic: true }) : guild.iconURL({ dynamic: true });

      // 4. สร้าง Embed แจ้งเตือนข้อความถูกแก้ไข
      const embed = new EmbedBuilder()
        .setAuthor({
          name: authorTag,
          iconURL: authorAvatar
        })
        .setTitle('✏️ ข้อความถูกแก้ไข (Message Edited)')
        .setColor(config.colors.warning)
        .addFields(
          { name: '💬 ช่องที่เกิดเหตุ', value: `${newMessage.channel}`, inline: true },
          { name: '👤 ผู้ส่งข้อความ', value: `${newMessage.author}`, inline: true },
          { name: '🔗 ลิงก์ข้อความ', value: `[ไปยังข้อความ](${newMessage.url})`, inline: true },
          { name: '⬅️ ก่อนแก้ไข (Before)', value: `\`\`\`\n${beforeContent}\n\`\`\``, inline: false },
          { name: '➡️ หลังแก้ไข (After)', value: `\`\`\`\n${afterContent}\n\`\`\``, inline: false }
        )
        .setFooter({
          text: `Message ID: ${newMessage.id} • ${guild.name}`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
      logger.info(`บันทึก Log ข้อความถูกแก้ไขในช่อง #${newMessage.channel.name} ของเซิร์ฟเวอร์ ${guild.name}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน messageUpdate event:', error);
    }
  }
};
