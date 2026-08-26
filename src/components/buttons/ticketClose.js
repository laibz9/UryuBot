/**
 * @file src/components/buttons/ticketClose.js
 * @description Button Handler เมื่อกดปุ่ม "🔒 ปิดตั๋ว" (customId: btn_close_ticket)
 */

const {
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { generateHtmlTranscript } = require('../../utils/transcript');
const { sendAuditLog } = require('../../utils/auditLogger');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'btn_close_ticket',

  /**
   * ประมวลผลเมื่อผู้ใช้กดปิดตั๋ว
   * @param {object} interaction - ButtonInteraction Object
   */
  async execute(interaction) {
    try {
      const channel = interaction.channel;
      const guild = interaction.guild;
      const closer = interaction.user;

      // 0. ตรวจสอบว่าอยู่ในห้อง Ticket หรือไม่ (ดูจาก channel topic)
      if (!channel.topic || !channel.topic.includes('Ticket Opener:')) {
        const errEmbed = createErrorEmbed('ดำเนินการไม่ได้', 'คำสั่งนี้สามารถใช้งานได้เฉพาะในห้อง Ticket เท่านั้น');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ดึง User ID ของผู้เปิดตั๋วจาก topic
      const openerMatch = channel.topic.match(/Ticket Opener:\s*([0-9]+)/);
      const openerId = openerMatch ? openerMatch[1] : null;
      let openerUser = null;
      if (openerId) {
        openerUser = await interaction.client.users.fetch(openerId).catch(() => null);
      }

      // 1. แจ้งเตือนการปิดตั๋วในห้องทันที
      const closingEmbed = new EmbedBuilder()
        .setTitle('🔒 กำลังปิดตั๋วและบันทึกประวัติ...')
        .setDescription(
          `ตั๋วนี้ถูกปิดโดย ${closer}\n` +
          `• ระบบกำลังสร้างไฟล์ HTML Transcript\n` +
          `• ประวัติการสนทนาจะถูกส่งไปยังช่องบันทึกประวัติและส่งเข้า DM ของผู้เปิดตั๋ว\n\n` +
          `*ห้องนี้จะถูกลบอัตโนมัติในอีก 5 วินาที*`
        )
        .setColor(config.colors.danger)
        .setTimestamp();

      await interaction.reply({ embeds: [closingEmbed] });

      // 2. ดึงข้อความทั้งหมดในห้องทิกเก็ต
      let allMessages = [];
      let lastId = null;

      while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        allMessages = allMessages.concat(Array.from(fetched.values()));
        lastId = fetched.last().id;

        if (fetched.size < 100) break;
      }

      // เรียงข้อความจากเก่าไปใหม่
      allMessages.reverse();

      // 3. สร้างไฟล์ HTML Transcript
      const transcriptAttachment = generateHtmlTranscript(channel, allMessages, openerUser || { tag: 'ไม่ทราบ' }, closer);

      // 4. สร้าง Embed สรุปการปิดตั๋ว
      const summaryEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${guild.name} • Ticket Transcript`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle('📁 บันทึกประวัติการสนทนา (Ticket Transcript)')
        .setColor(config.colors.accent)
        .addFields(
          { name: '🎫 ชื่อห้องทิกเก็ต', value: `\`#${channel.name}\``, inline: true },
          { name: '👤 ผู้เปิดตั๋ว', value: openerUser ? `${openerUser} (\`${openerUser.tag}\`)` : 'ไม่ทราบ', inline: true },
          { name: '🔒 ปิดโดย', value: `${closer} (\`${closer.tag}\`)`, inline: true },
          { name: '💬 จำนวนข้อความ', value: `\`${allMessages.length}\` ข้อความ`, inline: true },
          { name: '📅 วันที่ปิด', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({
          text: `Ticket ID: ${channel.id} • ${guild.name}`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      // 5. ส่งบันทึกลงช่อง Log
      await sendAuditLog(guild, summaryEmbed);
      // ส่งไฟล์แนบ Transcript ไปยังช่อง Log
      const { getLogChannel } = require('../../utils/auditLogger');
      const logChannel = getLogChannel(guild);
      if (logChannel) {
        await logChannel.send({
          content: `📄 **ไฟล์ประวัติการสนทนาของ #${channel.name}:**`,
          files: [transcriptAttachment]
        }).catch(() => {});
      }

      // 6. ส่ง Transcript เข้า DM ของผู้เปิดตั๋ว
      if (openerUser) {
        try {
          const dmTranscript = generateHtmlTranscript(channel, allMessages, openerUser, closer);
          const dmEmbed = new EmbedBuilder()
            .setAuthor({
              name: guild.name,
              iconURL: guild.iconURL({ dynamic: true })
            })
            .setTitle('📁 ประวัติการสนทนาทิกเก็ตของคุณ')
            .setDescription(
              `ทิกเก็ต **#${channel.name}** ในเซิร์ฟเวอร์ **${guild.name}** ได้ถูกปิดเรียบร้อยแล้ว\n\n` +
              `บอทได้แนบไฟล์ **HTML Transcript** สรุปบทสนทนาทั้งหมดไว้ด้านล่าง คุณสามารถดาวน์โหลดและเปิดดูในบราวเซอร์ได้ตลอดเวลาครับ`
            )
            .setColor(config.colors.accent)
            .setFooter({ text: 'ขอบคุณที่ติดต่อทีมงาน' })
            .setTimestamp();

          await openerUser.send({
            embeds: [dmEmbed],
            files: [dmTranscript]
          });
          logger.info(`ส่ง DM Transcript สำเร็จให้แก่ผู้ใช้ ${openerUser.tag}`);
        } catch {
          logger.warn(`ไม่สามารถส่ง DM Transcript ให้แก่ ${openerUser.tag} ได้ (ผู้ใช้อาจปิดรับ DM)`);
        }
      }

      logger.success(`ปิดห้องทิกเก็ต #${channel.name} เรียบร้อยโดย ${closer.tag}`);

      // 7. หน่วงเวลา 5 วินาทีแล้วลบห้อง
      setTimeout(async () => {
        try {
          await channel.delete(`Ticket ปิดโดย ${closer.tag}`);
        } catch (err) {
          logger.error('เกิดข้อผิดพลาดขณะลบห้อง Ticket:', err);
        }
      }, 5000);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะดำเนินการปิด Ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
