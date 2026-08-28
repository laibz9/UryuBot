/**
 * @file src/events/messages/musicRequest.js
 * @description Event ดักจับข้อความในห้องขอเพลงประจำเซิร์ฟเวอร์ เพื่อดึงเพลงเข้าคิวเล่นอัตโนมัติ
 */

const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { isDedicatedMusicChannel } = require('../../utils/musicManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  once: false,

  /**
   * ประมวลผลเมื่อมีข้อความถูกส่งในเซิร์ฟเวอร์
   * @param {object} message - Discord Message Object
   * @param {object} client - Discord Client Instance
   */
  async execute(message, client) {
    try {
      // ข้ามหากเป็นข้อความของบอท หรือส่งนอกกิลด์
      if (!message.guild || message.author.bot) return;

      if (!isDedicatedMusicChannel(message.channel)) return;

      const query = message.content.trim();
      if (!query) return;

      // ลบข้อความที่ผู้ใช้พิมพ์เพื่อรักษาความสะอาดของห้อง
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 800);

      // ตรวจสอบว่าผู้ใช้อยู่ในห้อง Voice หรือไม่
      const voiceChannel = message.member?.voice?.channel;
      if (!voiceChannel) {
        const warnMsg = await message.channel.send({
          content: `⚠️ ${message.author} กรุณาเชื่อมต่อห้องเสียง (Voice Channel) ก่อนขอเพลงครับ`
        }).catch(() => null);
        if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }

      // ตรวจสอบสิทธิ์ของบอทในการเข้าห้องเสียง
      const botMember = message.guild.members.me;
      const botPermissions = voiceChannel.permissionsFor(botMember);
      if (botPermissions && (!botPermissions.has(PermissionFlagsBits.Connect) || !botPermissions.has(PermissionFlagsBits.Speak))) {
        const warnMsg = await message.channel.send({
          content: `⚠️ บอทไม่มีสิทธิ์เชื่อมต่อ (Connect) หรือเปิดไมค์ (Speak) ในห้องเสียง ${voiceChannel} กรุณาตั้งค่าสิทธิ์ให้บอทครับ`
        }).catch(() => null);
        if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
        return;
      }

      // เล่นเพลงผ่าน DisTube
      logger.info(`ดึงเพลง "${query}" จากห้องขอเพลงโดย ${message.author.tag}`);
      await client.distube.play(voiceChannel, query, {
        member: message.member,
        textChannel: message.channel
      });
    } catch (error) {
      if (error.errorCode === 'VOICE_CONNECT_FAILED' || error.message?.includes('VOICE_CONNECT_FAILED')) {
        logger.warn(`[DisTube] ไม่สามารถเชื่อมต่อห้องเสียงได้หลังจาก 30 วินาที (${message.author.tag})`);
        const errMsg = await message.channel.send({
          content: '⚠️ ไม่สามารถเชื่อมต่อห้องเสียงได้ กรุณาตรวจสอบว่าบอทมีสิทธิ์เข้าห้องเสียง และลองขอเพลงใหม่อีกครั้งครับ'
        }).catch(() => null);
        if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 6000);
        return;
      }

      logger.error('เกิดข้อผิดพลาดในการเล่นเพลงอัตโนมัติจากห้องขอเพลง:', error);
      const errMsg = await message.channel.send({
        content: `❌ ไม่สามารถเล่นเพลงนี้ได้: \`${error.message?.slice(0, 100) || 'Error'}\``
      }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
    }
  }
};
