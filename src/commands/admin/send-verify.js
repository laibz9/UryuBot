/**
 * @file src/commands/admin/send-verify.js
 * @description Slash Command สำหรับส่งแผงยืนยันตัวตน (Verification Panel) พร้อมปุ่มกด Verify
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const { createVerificationEmbed } = require('../../utils/embeds');
const { checkCommandPermission } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send-verify')
    .setDescription('ส่งแผงยืนยันตัวตน (Verification Panel) ไปยังช่องที่กำหนด (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // ให้สิทธิ์เฉพาะ Manage Guild / Administrator
    .setDMPermission(false) // ไม่อนุญาตให้ใช้ใน DM
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่องที่ต้องการส่งแผงยืนยันตัวตน (หากไม่ระบุจะส่งในช่องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /send-verify
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      // 0. ตรวจสอบสิทธิ์ผู้ใช้งาน (Role Permission Guard)
      const hasPerm = await checkCommandPermission(interaction, 'admin');
      if (!hasPerm) return;

      // ตรวจสอบห้องเป้าหมาย หากไม่ระบุให้ใช้ห้องปัจจุบัน
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      // ตรวจสอบสิทธิ์การส่งข้อความของบอทในช่องเป้าหมาย
      const permissions = targetChannel.permissionsFor(interaction.guild.members.me);
      if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        return await interaction.reply({
          content: `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${targetChannel}`,
          flags: MessageFlags.Ephemeral
        });
      }

      // สร้าง Embed สำหรับยืนยันตัวตน
      const embed = createVerificationEmbed(interaction.guild);

      // สร้างปุ่มกด Verify (customId: btn_verify)
      const verifyButton = new ButtonBuilder()
        .setCustomId('btn_verify')
        .setLabel('ยืนยันตัวตน (Verify)')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

      const actionRow = new ActionRowBuilder().addComponents(verifyButton);

      // ส่ง Embed พร้อมปุ่มไปยังช่องเป้าหมาย
      await targetChannel.send({
        embeds: [embed],
        components: [actionRow]
      });

      // ตอบกลับผู้ใช้งานคำสั่งแบบ Ephemeral
      await interaction.reply({
        content: `ส่งแผงยืนยันตัวตนไปยังช่อง ${targetChannel} เรียบร้อยแล้ว`,
        flags: MessageFlags.Ephemeral
      });

      logger.success(`ส่งแผงยืนยันตัวตนไปยังช่อง #${targetChannel.name} โดย ${interaction.user.tag}`);
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /send-verify:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการส่งแผงยืนยันตัวตน กรุณาลองใหม่อีกครั้ง',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
