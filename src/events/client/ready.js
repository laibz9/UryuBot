/**
 * @file src/events/client/ready.js
 * @description Event Handler เมื่อบอทออนไลน์และพร้อมทำงาน (clientReady)
 */

const { ActivityType, Events } = require('discord.js');
const { cleanupMusicChannelOnStartup } = require('../../utils/musicManager');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * ทำงานเมื่อบอทเข้าสู่สถานะ Ready
   * @param {object} client - Instance ของ Discord Client
   */
  async execute(client) {
    logger.success(`==============================================`);
    logger.success(`บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);
    logger.success(`ประจำการอยู่ทั้งหมด: ${client.guilds.cache.size} เซิร์ฟเวอร์`);
    logger.success(`==============================================`);

    // ล้างข้อความตกค้างและตั้งค่าแผงควบคุมเพลงเริ่มต้นในห้องขอเพลง
    await cleanupMusicChannelOnStartup(client);

    // ล้างคำสั่งระดับ Guild เก่าที่อาจซ้ำซ้อน และลงทะเบียน Global Application Commands
    try {
      // 1. ล้างคำสั่งระดับ Guild เก่าที่ทำให้เกิดคำสั่งซ้ำ 2 อันใน Discord
      for (const guild of client.guilds.cache.values()) {
        try {
          const guildCmds = await guild.commands.fetch();
          if (guildCmds && guildCmds.size > 0) {
            await guild.commands.set([]);
            logger.info(`🧹 ล้างคำสั่งระดับ Guild ที่ซ้ำซ้อนในเซิร์ฟเวอร์ [${guild.name}] เรียบร้อย (${guildCmds.size} คำสั่ง)`);
          }
        } catch (gErr) {
          // ข้ามหากไม่มีสิทธิ์ในบางกิลด์
        }
      }

      // 2. ลงทะเบียน Global Application Commands เป็นชุดเดียว
      const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON ? cmd.data.toJSON() : cmd.data);
      if (client.application) {
        await client.application.commands.set(commandsData);
        logger.success(`[Global Slash Commands] ลงทะเบียน ${commandsData.length} คำสั่งหลักไปยังทุกเซิร์ฟเวอร์เรียบร้อยแล้ว!`);
      }
    } catch (err) {
      logger.error('เกิดข้อผิดพลาดในการลงทะเบียน Slash Commands:', err);
    }

    // ฟังก์ชันอัปเดตสถานะสีม่วง (Streaming Status)
    const updateStreamingPresence = () => {
      try {
        const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
        
        const statusList = [
          '🛡️ ดูแลความปลอดภัยและระบบเซิร์ฟเวอร์',
          `👥 ประจำการดูแลสมาชิก ${totalMembers} คน`,
          '⚡ Slash Commands | /help',
          '💜 uryu_bot Community Guard'
        ];

        const randomStatus = statusList[Math.floor(Math.random() * statusList.length)];

        // ActivityType.Streaming จะทำให้ขึ้นจุดสถานะสีม่วง (Purple Streaming Badge)
        client.user.setPresence({
          activities: [
            {
              name: randomStatus,
              type: ActivityType.Streaming,
              url: 'https://www.twitch.tv/discord' // Discord ต้องการ Twitch/YouTube URL เพื่อแสดงสถานะสีม่วง
            }
          ],
          status: 'online'
        });
      } catch (error) {
        logger.error('เกิดข้อผิดพลาดขณะตั้งค่า Status ของบอท:', error);
      }
    };

    // เรียกใช้งานทันทีเมื่อบอทเปิด
    updateStreamingPresence();

    // วนลูปเปลี่ยนข้อความสถานะทุกๆ 30 วินาที โดยคงสีม่วงไว้ตลอดเวลา
    setInterval(updateStreamingPresence, 30 * 1000);
  }
};
