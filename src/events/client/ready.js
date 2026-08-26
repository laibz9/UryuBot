/**
 * @file src/events/client/ready.js
 * @description Event Handler เมื่อบอทออนไลน์และพร้อมทำงาน (clientReady)
 */

const { ActivityType, Events } = require('discord.js');
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

    // ฟังก์ชันอัปเดตสถานะสีม่วง (Streaming Status)
    const updateStreamingPresence = () => {
      try {
        const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
        
        const statusList = [
          '🛡️ ดูแลความปลอดภัยและระบบเซิร์ฟเวอร์',
          `👥 ประจำการดูแลสมาชิก ${totalMembers} คน`,
          '⚡ Slash Commands | /ping',
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
