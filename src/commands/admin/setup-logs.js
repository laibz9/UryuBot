/**
 * @file src/commands/admin/setup-logs.js
 * @description Slash Command สำหรับตั้งค่าช่องบันทึกประวัติเซิร์ฟเวอร์ Audit Logs (/setup-logs)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { getGuildSettings, updateGuildSettings } = require('../../database/db');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('ตั้งค่าช่องบันทึกประวัติเซิร์ฟเวอร์ (หากไม่ระบุช่อง บอทจะใช้ช่องเดิมหรือสร้างใหม่อัตโนมัติ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่อง (Channel) สำหรับส่งการแจ้งเตือน Audit Logs (ไม่ระบุ = ใช้ช่องในระบบ/สร้างใหม่)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('เปิดหรือปิดการใช้งานระบบบันทึกประวัติ')
        .setRequired(false)
        .addChoices(
          { name: '🟢 เปิดใช้งานระบบ (Enable)', value: 'enable' },
          { name: '🔴 ปิดใช้งานระบบ (Disable)', value: 'disable' }
        )
    ),

  /**
   * ประมวลผลคำสั่ง /setup-logs
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const member = interaction.member;

      // 0. ตรวจสอบสิทธิ์เฉพาะ Server Owner หรือผู้มียศ Leader / Admin
      const isServerOwner = guild.ownerId === member.id;
      const isLeader = config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId);
      const isSystemAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isServerOwner && !isLeader && !isSystemAdmin) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์ไม่เพียงพอ',
          'คำสั่ง **/setup-logs** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const status = interaction.options.getString('status');

      // หากเลือกปิดใช้งานระบบ
      if (status === 'disable') {
        await updateGuildSettings(guild.id, { enableLogSystem: false });
        const disableEmbed = new EmbedBuilder()
          .setTitle('🔴 ปิดใช้งานระบบบันทึกประวัติเรียบร้อย')
          .setDescription('ระบบ Audit Logger ถูกปิดใช้งานแล้ว และบันทึกลง MySQL เรียบร้อยครับ')
          .setColor(config.colors.danger)
          .setTimestamp();
        return await interaction.editReply({ embeds: [disableEmbed] });
      }

      // ดึงการตั้งค่าปัจจุบันจาก DB
      const currentSettings = getGuildSettings(guild.id);

      // 1. ค้นหาหรือสร้างช่อง Audit Logs
      let logChannel = interaction.options.getChannel('channel');

      if (!logChannel && currentSettings.logChannelId) {
        logChannel = guild.channels.cache.get(currentSettings.logChannelId) || 
          await guild.channels.fetch(currentSettings.logChannelId).catch(() => null);
      }

      if (!logChannel) {
        logChannel = guild.channels.cache.find(c => 
          c.type === ChannelType.GuildText && (c.name.includes('logs') || c.name.includes('log') || c.name.includes('ประวัติ'))
        );
      }

      if (!logChannel) {
        logChannel = await guild.channels.create({
          name: 'logs',
          type: ChannelType.GuildText,
          topic: '🛡️ บันทึกประวัติการกระทำและ Audit Logs ภายในเซิร์ฟเวอร์',
          reason: `สร้างช่องบันทึกประวัติอัตโนมัติโดย ${interaction.user.tag}`
        });
      }

      // 2. บันทึกลง MySQL & In-Memory Cache ทันที
      await updateGuildSettings(guild.id, {
        logChannelId: logChannel.id,
        enableLogSystem: true
      });

      // 3. ส่งข้อความทดสอบไปยังช่องบันทึกประวัติ
      const botMember = guild.members.me;
      const permissions = logChannel.permissionsFor(botMember);
      if (permissions && permissions.has(PermissionFlagsBits.SendMessages) && permissions.has(PermissionFlagsBits.EmbedLinks)) {
        try {
          const testEmbed = new EmbedBuilder()
            .setTitle('🛡️ ระบบบันทึกประวัติ Audit Logger พร้อมทำงาน')
            .setDescription(
              `ช่องนี้ได้รับการตั้งค่าเป็นช่องรับการแจ้งเตือน Audit Logs เรียบร้อยแล้ว\n\n` +
              `• 🗑️ การลบข้อความ (Message Delete)\n` +
              `• ✏️ การแก้ไขข้อความ (Message Edit)\n` +
              `• 🔨 การเตะ / แบน / ปลดล็อกดาวน์ (Mod Actions)`
            )
            .setColor(config.colors.info)
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          await logChannel.send({ embeds: [testEmbed] });
        } catch (e) {
          logger.warn('ไม่สามารถส่งตัวอย่าง Log ได้:', e.message);
        }
      }

      logger.success(`ตั้งค่าช่อง Log (#${logChannel.name}) สำเร็จใน ${guild.name} โดย ${interaction.user.tag}`);

      // 4. ตอบกลับผู้ใช้งานคำสั่ง
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ ตั้งค่าระบบ Audit Logger สำเร็จ')
        .setDescription(
          `บอทได้ทำการเชื่อมต่อและบันทึกช่อง Log ลงฐานข้อมูลเรียบร้อยแล้วครับ\n\n` +
          `🛡️ **ช่องบันทึกประวัติ (Logs Channel):** ${logChannel}\n` +
          `🟢 **สถานะ:** เปิดใช้งาน (Active)\n\n` +
          `💡 *หากต้องการเปลี่ยนช่องในภายหลัง สามารถเลือกผ่านคำสั่งหรือ Web Dashboard ได้ทันทีครับ*`
        )
        .setColor(config.colors.success)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-logs:', error);

      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
