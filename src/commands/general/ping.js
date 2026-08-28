/**
 * @file src/commands/general/ping.js
 * @description Slash Command สำหรับตรวจสอบค่าความหน่วง (Latency), แรม และสถานะของบอท (/ping)
 */

const { SlashCommandBuilder, EmbedBuilder, version: djsVersion, MessageFlags } = require('discord.js');
const os = require('os');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * แปลงหน่วยวินาทีเป็นข้อความ Uptime ที่อ่านง่าย
 * @param {number} totalSeconds - จำนวนวินาทีทั้งหมด
 * @returns {string} ข้อความ Uptime เช่น "1 วัน 2 ชั่วโมง 30 นาที 15 วินาที"
 */
function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  parts.push(`${seconds} วินาที`);

  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ตรวจสอบค่าความหน่วง (Ping), การใช้งานแรม และสถานะของระบบ')
    .setDMPermission(false),

  /**
   * ประมวลผลคำสั่ง /ping
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const sentTime = Date.now();
      await interaction.deferReply();

      const apiLatency = Date.now() - sentTime;
      const wsPing = interaction.client.ws.ping;

      // คำนวณการใช้งาน RAM
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
      const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(1);
      const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(1);

      // Uptime
      const uptimeStr = formatUptime(process.uptime());

      // สถิติเซิร์ฟเวอร์
      const totalGuilds = interaction.client.guilds.cache.size;
      const totalMembers = interaction.client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);

      // กำหนดสี Embed ตามระดับความเร็วของ Ping
      let statusColor = config.colors.success;
      let statusText = '🟢 ยอดเยี่ยม (Excellent)';
      if (wsPing > 200 || apiLatency > 300) {
        statusColor = config.colors.danger;
        statusText = '🔴 ช้า (High Latency)';
      } else if (wsPing > 100 || apiLatency > 150) {
        statusColor = config.colors.warning;
        statusText = '🟡 ปานกลาง (Moderate)';
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.client.user.username} • System Status`,
          iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle('🏓 ผลการทดสอบความเร็วและสถานะระบบ')
        .setColor(statusColor)
        .addFields(
          {
            name: '⚡ ความหน่วง (Latency)',
            value: `▸ **WebSocket Ping:** \`${wsPing} ms\`\n` +
                   `▸ **API Roundtrip:** \`${apiLatency} ms\`\n` +
                   `▸ **สถานะการเชื่อมต่อ:** ${statusText}`,
            inline: false
          },
          {
            name: '📊 การใช้งานหน่วยความจำ (RAM)',
            value: `▸ **Heap Used:** \`${heapUsedMB} MB\` / \`${heapTotalMB} MB\`\n` +
                   `▸ **RSS Total:** \`${rssMB} MB\``,
            inline: true
          },
          {
            name: '⏱️ เวลาที่ออนไลน์ (Uptime)',
            value: `▸ **ออนไลน์ต่อเนื่อง:**\n\`${uptimeStr}\``,
            inline: true
          },
          {
            name: '🖥️ ข้อมูลสิ่งแวดล้อมระบบ',
            value: `▸ **Node.js:** \`${process.version}\`\n` +
                   `▸ **Discord.js:** \`v${djsVersion}\`\n` +
                   `▸ **เซิร์ฟเวอร์:** \`${totalGuilds}\` แห่ง | **สมาชิกรวม:** \`${totalMembers}\` คน`,
            inline: false
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /ping:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' });
      } else {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
