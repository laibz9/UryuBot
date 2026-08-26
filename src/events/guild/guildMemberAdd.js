/**
 * @file src/events/guild/guildMemberAdd.js
 * @description Event Handler เมื่อมีสมาชิกใหม่เข้าร่วมเซิร์ฟเวอร์ (guildMemberAdd)
 */

const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createWelcomeEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  /**
   * ประมวลผลเมื่อสมาชิกใหม่เข้าร่วมเซิร์ฟเวอร์
   * @param {object} member - Discord GuildMember Object
   */
  async execute(member) {
    try {
      // 0. ตรวจสอบว่าระบบต้อนรับถูกเปิดใช้งานอยู่หรือไม่
      if (!config.bot.enableWelcomeSystem) {
        return;
      }

      const guild = member.guild;
      let welcomeChannel = null;

      // 1. ค้นหาช่องต้อนรับจาก WELCOME_CHANNEL_ID ใน .env ก่อน
      if (config.bot.welcomeChannelId) {
        welcomeChannel = guild.channels.cache.get(config.bot.welcomeChannelId);
      }

      // 2. หากไม่ได้ตั้งค่าใน .env ค้นหาช่องอัตโนมัติ (systemChannel หรือช่องชื่อ welcome/ต้อนรับ)
      if (!welcomeChannel) {
        welcomeChannel = guild.systemChannel || guild.channels.cache.find(
          c => c.type === ChannelType.GuildText && 
               (c.name.includes('welcome') || c.name.includes('ต้อนรับ') || c.name.includes('general'))
        );
      }

      if (!welcomeChannel) {
        logger.warn(`ไม่พบช่องสำหรับส่งข้อความต้อนรับในเซิร์ฟเวอร์ ${guild.name}`);
        return;
      }

      // 3. ตรวจสอบสิทธิ์การส่งข้อความของบอทในช่องเป้าหมาย
      const permissions = welcomeChannel.permissionsFor(guild.members.me);
      if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        logger.warn(`บอทไม่มีสิทธิ์ส่ง Embed ในช่อง ${welcomeChannel.name} ของเซิร์ฟเวอร์ ${guild.name}`);
        return;
      }

      // 4. สร้างและส่ง Embed ต้อนรับ
      const welcomeEmbed = createWelcomeEmbed(member);

      await welcomeChannel.send({
        content: `👋 ยินดีต้อนรับ ${member}!`,
        embeds: [welcomeEmbed]
      });

      logger.info(`ส่งข้อความต้อนรับสมาชิกใหม่ ${member.user.tag} ในเซิร์ฟเวอร์ ${guild.name} สำเร็จ`);
    } catch (error) {
      logger.error(`เกิดข้อผิดพลาดใน guildMemberAdd event สำหรับ ${member.user.tag}:`, error);
    }
  }
};
