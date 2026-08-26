/**
 * @file src/components/buttons/ticketOpen.js
 * @description Button Handler เมื่อกดปุ่ม "📩 เปิดตั๋วติดต่อทีมงาน" (customId: btn_open_ticket)
 */

const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'btn_open_ticket',

  /**
   * ประมวลผลเมื่อผู้ใช้กดเปิดตั๋ว
   * @param {object} interaction - ButtonInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const user = interaction.user;
      const member = interaction.member;

      // 0. ตรวจสอบว่าผู้ใช้มีตั๋วที่เปิดค้างอยู่แล้วหรือไม่
      const existingChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText &&
             c.topic &&
             c.topic.includes(`Ticket Opener: ${user.id}`)
      );

      if (existingChannel) {
        const alreadyOpenEmbed = createErrorEmbed(
          'เปิดตั๋วไม่สำเร็จ',
          `คุณมีห้องทิกเก็ตที่เปิดค้างไว้อยู่แล้ว: ${existingChannel}\nกรุณาใช้ห้องเดิมหรือกดปิดตั๋วก่อนเปิดใหม่ครับ`
        );
        return await interaction.reply({ embeds: [alreadyOpenEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 1. กำหนดโครงสร้าง Permission Overwrites
      const permissionOverwrites = [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id, // ผู้เปิดตั๋ว
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: guild.members.me.id, // บอท
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ];

      // เพิ่มสิทธิ์ให้ทีมงาน (Leader / Admin / Mod)
      if (config.bot.leaderRoleId && guild.roles.cache.has(config.bot.leaderRoleId)) {
        permissionOverwrites.push({
          id: config.bot.leaderRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        });
      }

      if (config.bot.adminRoleId && guild.roles.cache.has(config.bot.adminRoleId)) {
        permissionOverwrites.push({
          id: config.bot.adminRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        });
      }

      if (config.bot.moderatorRoleId && guild.roles.cache.has(config.bot.moderatorRoleId)) {
        permissionOverwrites.push({
          id: config.bot.moderatorRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        });
      }

      // 2. สร้างชื่อห้อง (Clean name)
      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || user.id.slice(-4);
      const channelName = `ticket-${cleanUsername}`;

      // 3. ตรวจสอบ Category ถ้ามี
      let parentCategory = null;
      if (config.bot.ticketCategoryId) {
        parentCategory = guild.channels.cache.get(config.bot.ticketCategoryId) || null;
      }

      // 4. สร้างห้องทิกเก็ต
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentCategory ? parentCategory.id : null,
        topic: `Ticket Opener: ${user.id} | Created by ${user.tag}`,
        permissionOverwrites: permissionOverwrites,
        reason: `เปิด Ticket โดย ${user.tag}`
      });

      // 5. ส่งข้อความต้อนรับในห้องทิกเก็ต
      const welcomeEmbed = new EmbedBuilder()
        .setAuthor({
          name: `Ticket #${ticketChannel.name}`,
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle('👋 ยินดีต้อนรับสู่ระบบติดต่อทีมงาน')
        .setDescription(
          `สวัสดีครับคุณ ${user} ทีมงานได้รับคำขอเปิดตั๋วของคุณเรียบร้อยแล้ว\n\n` +
          `💬 **กรุณาระบุรายละเอียด:**\n` +
          `• แจ้งปัญหาหรือเรื่องที่ต้องการสอบถาม\n` +
          `• แนบรูปภาพหรือหลักฐานที่เกี่ยวข้อง (ถ้ามี)\n\n` +
          `*ทีมงานจะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ เมื่อเสร็จสิ้นสามารถกดปุ่ม **"🔒 ปิดตั๋ว"** ได้ทันที*`
        )
        .setColor(config.colors.primary)
        .setFooter({
          text: `Ticket ID: ${ticketChannel.id} • ${guild.name}`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('btn_close_ticket')
        .setLabel('ปิดตั๋ว (Close Ticket)')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(closeButton);

      // แจ้งเตือนแท็กผู้เปิด
      await ticketChannel.send({
        content: `👋 ยินดีต้อนรับ ${user} | ทีมงานจะเข้ามาให้บริการในไม่ช้า`,
        embeds: [welcomeEmbed],
        components: [actionRow]
      });

      logger.info(`สร้างห้องทิกเก็ต #${ticketChannel.name} สำเร็จสำหรับผู้ใช้ ${user.tag}`);

      // 6. แจ้งกลับผู้ใช้งาน
      await interaction.editReply({
        content: `✅ เปิดห้องทิกเก็ตของคุณเรียบร้อยแล้ว: ${ticketChannel}`
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดในการเปิด Ticket:', error);
      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
