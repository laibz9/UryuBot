/**
 * @file src/events/guild/voiceStateUpdate.js
 * @description Event ดักจับการเปลี่ยนแปลงสถานะในห้องเสียง (VoiceStateUpdate) และตัดการเชื่อมต่ออัตโนมัติเมื่อไม่มีสมาชิก
 */

const { Events } = require('discord.js');
const logger = require('../../utils/logger');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');

// บันทึก Timers สำหรับแต่ละ Guild
const leaveTimeouts = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,

  /**
   * ทำงานเมื่อมีผู้ใช้เข้า/ออก/ย้ายห้องเสียง
   * @param {object} oldState - VoiceState เก่า
   * @param {object} newState - VoiceState ใหม่
   */
  async execute(oldState, newState) {
    try {
      const guild = oldState.guild || newState.guild;
      if (!guild) return;

      const botMember = guild.members.me;
      const botVoiceChannel = botMember?.voice?.channel;

      // ถ้าบอทไม่ได้อยู่ในห้องเสียง ให้ล้าง Timer ที่ค้างอยู่ (ถ้ามี)
      if (!botVoiceChannel) {
        if (leaveTimeouts.has(guild.id)) {
          clearTimeout(leaveTimeouts.get(guild.id));
          leaveTimeouts.delete(guild.id);
        }
        return;
      }

      // นับจำนวนสมาชิกที่เป็นคนจริง (ไม่นับบอท) ในห้องเสียงที่บอทอยู่
      const humanMembers = botVoiceChannel.members.filter(m => !m.user.bot);

      if (humanMembers.size === 0) {
        // ถ้าไม่มีคนอยู่ในห้องเสียง และยังไม่มีการตั้งเวลา ให้เริ่มนับถอยหลัง 60 วินาที
        if (!leaveTimeouts.has(guild.id)) {
          logger.info(`[Music Auto-Leave] ตรวจพบห้องเสียง #${botVoiceChannel.name} ไม่มีสมาชิก เริ่มนับถอยหลัง 60 วินาที...`);

          const timer = setTimeout(async () => {
            try {
              const currentBotMember = guild.members.me;
              const currentChannel = currentBotMember?.voice?.channel;
              if (!currentChannel) return;

              const currentHumans = currentChannel.members.filter(m => !m.user.bot);
              if (currentHumans.size === 0) {
                logger.info(`[Music Auto-Leave] ไม่มีคนอยู่ในห้องเสียง #${currentChannel.name} (${guild.name}) เกิน 60 วินาที บอทออกจากห้องและรีเซ็ตแผงควบคุมแล้ว`);

                const client = guild.client;
                if (client.distube) {
                  const queue = client.distube.getQueue(guild.id);
                  if (queue) {
                    queue.stop();
                  }
                  client.distube.voices.leave(guild);
                } else {
                  currentBotMember.voice.disconnect().catch(() => {});
                }

                // รีเซ็ตแผงควบคุมในห้องขอเพลงกลับสู่หน้า Standby
                await updateDedicatedMusicPanel(guild, null, null);
              }
            } catch (err) {
              logger.error('เกิดข้อผิดพลาดขณะบอทออกจากห้องเสียงอัตโนมัติ:', err);
            } finally {
              leaveTimeouts.delete(guild.id);
            }
          }, 60 * 1000); // 60 วินาที

          leaveTimeouts.set(guild.id, timer);
        }
      } else {
        // หากมีสมาชิกกลับเข้ามาในห้องเสียง ให้ยกเลิกการนับถอยหลัง
        if (leaveTimeouts.has(guild.id)) {
          logger.info(`[Music Auto-Leave] มีสมาชิกกลับเข้ามาในห้องเสียง #${botVoiceChannel.name} ยกเลิกการนับถอยหลังออกจากห้อง`);
          clearTimeout(leaveTimeouts.get(guild.id));
          leaveTimeouts.delete(guild.id);
        }
      }
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน voiceStateUpdate Event:', error);
    }
  }
};
