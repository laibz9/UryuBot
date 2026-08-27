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
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('ตั้งค่าช่องบันทึกประวัติการลบและแก้ไขข้อความ (เฉพาะเจ้าของเซิร์ฟเวอร์)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่อง (Channel) สำหรับส่งการแจ้งเตือน Audit Logs')
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

      const status = interaction.options.getString('status');

      // หากเลือกปิดใช้งานระบบ
      if (status === 'disable') {
        const { updateGuildSettings } = require('../../database/db');
        await updateGuildSettings(guild.id, { enableLogSystem: false });
        const disableEmbed = new EmbedBuilder()
          .setTitle('🔴 ปิดใช้งานระบบบันทึกประวัติเรียบร้อย')
          .setDescription('ระบบ Audit Logger ถูกปิดใช้งานแล้ว และบันทึกลง MySQL เรียบร้อยครับ')
          .setColor(config.colors.danger)
          .setTimestamp();
        return await interaction.reply({ embeds: [disableEmbed], flags: MessageFlags.Ephemeral });
      }

      const logChannel = interaction.options.getChannel('channel') || interaction.channel;
      const botMember = guild.members.me;

      // บันทึกลง MySQL ทันที
      const { updateGuildSettings } = require('../../database/db');
      await updateGuildSettings(guild.id, {
        logChannelId: logChannel.id,
        enableLogSystem: true
      });

      // 1. ตรวจสอบสิทธิ์ของบอทในช่องเป้าหมาย
      const permissions = logChannel.permissionsFor(botMember);
      if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${logChannel}`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 2. ส่งข้อความทดสอบไปยังช่องบันทึกประวัติ
      const testEmbed = new EmbedBuilder()
        .setTitle('🛡️ ระบบบันทึกประวัติ Audit Logger พร้อมทำงาน')
        .setDescription(
          `ช่องนี้ได้รับการตั้งค่าเป็นช่องรับการแจ้งเตือน Audit Logs เรียบร้อยแล้ว\n\n` +
          `• 🗑️ การลบข้อความ (Message Delete)\n` +
          `• ✏️ การแก้ไขข้อความ (Message Edit)`
        )
        .setColor(config.colors.info)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await logChannel.send({ embeds: [testEmbed] });

      logger.success(`ตั้งค่าช่อง Log (${logChannel.name}) สำเร็จใน ${guild.name} โดย ${interaction.user.tag}`);

      // 3. ตอบกลับผู้ใช้งานคำสั่ง
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ ตั้งค่าระบบ Audit Logger สำเร็จ')
        .setDescription(
          `บอทได้ทำการส่งข้อความทดสอบไปยังช่อง ${logChannel} เรียบร้อยแล้วครับ\n\n` +
          `💡 **นำ ID ไปใส่ในไฟล์ \`.env\` เพื่อให้บันทึกถาวร:**\n` +
          `\`\`\`env\n` +
          `LOG_CHANNEL_ID=${logChannel.id}\n` +
          `ENABLE_LOG_SYSTEM=true\n` +
          `\`\`\``
        )
        .setColor(config.colors.success)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-logs:', error);

      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
