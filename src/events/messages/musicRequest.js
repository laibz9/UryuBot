/**
 * @file src/events/messages/musicRequest.js
 * @description Event ดักจับข้อความในห้องขอเพลงประจำเซิร์ฟเวอร์ เพื่อดึงเพลงเข้าคิวเล่นอัตโนมัติ
 */

const { Events, ChannelType } = require('discord.js');
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
        });
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }

      // เล่นเพลงผ่าน DisTube
      logger.info(`ดึงเพลง "${query}" จากห้องขอเพลงโดย ${message.author.tag}`);
      await client.distube.play(voiceChannel, query, {
        member: message.member,
        textChannel: message.channel
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดในการเล่นเพลงอัตโนมัติจากห้องขอเพลง:', error);
      const errMsg = await message.channel.send({
        content: `❌ ไม่สามารถเล่นเพลงนี้ได้: \`${error.message?.slice(0, 100) || 'Error'}\``
      }).catch(() => null);
      if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000);
    }
  }
};
