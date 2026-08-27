/**
 * @file src/components/buttons/ticketOpen.js
 * @description Button Handler เมื่อกดปุ่มเปิดตั๋ว (customId: btn_open_ticket หรือ btn_ticket_open)
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
const { getGuildSettings, getNextTicketNumber, updateGuildSettings } = require('../../database/db');
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
      const botMember = guild.members.me;

      // 0. ตรวจสอบสิทธิ์การสร้างห้องของบอท (Manage Channels Guard)
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await interaction.reply({
          content: '❌ บอทไม่มีสิทธิ์ **Manage Channels (จัดการช่อง)** ในเซิร์ฟเวอร์ กรุณาให้สิทธิ์บอทเพื่อเปิดทิกเก็ต',
          flags: MessageFlags.Ephemeral
        });
      }

      // ดึงการตั้งค่ายศและหมวดหมู่ทิกเก็ตจาก MySQL / Cache
      const settings = getGuildSettings(guild.id);

      // 1. ตรวจสอบว่าผู้ใช้มีตั๋วที่เปิดค้างอยู่แล้วหรือไม่
      const existingChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText &&
             c.topic &&
             c.topic.includes(`Ticket Opener: ${user.id}`)
      );

      if (existingChannel) {
        const alreadyOpenEmbed = createErrorEmbed(
          'เปิดตั๋วไม่สำเร็จ',
          `คุณมีห้องทิกเก็ตที่เปิดค้างไว้อยู่แล้ว: ${existingChannel}\nกรุณาใช้ห้องเดิม หรือกดปิดตั๋วในห้องนั้นก่อนเปิดใหม่ครับ`
        );
        return await interaction.reply({ embeds: [alreadyOpenEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 2. กำหนดโครงสร้าง Permission Overwrites (ความปลอดภัยสูงสุด)
      const permissionOverwrites = [
        {
          id: guild.id, // @everyone ปิดไม่ให้เห็น
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
          id: botMember.id, // บอท
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

      // เพิ่มสิทธิ์ให้ยศทีมงาน (Leader / Admin / Moderator จาก MySQL)
      const staffRoleIds = [
        settings.leaderRoleId,
        settings.adminRoleId,
        settings.moderatorRoleId
      ].filter(Boolean);

      for (const roleId of staffRoleIds) {
        if (guild.roles.cache.has(roleId)) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          });
        }
      }

      // 3. หาเลขลำดับ Ticket ถัดไป (เช่น 1, 2, 3, ...)
      const ticketNum = typeof getNextTicketNumber === 'function' ? await getNextTicketNumber(guild.id) : 1;

      // 4. กำหนดชื่อห้องรูปแบบ ticket-<username>-<ticketNumber> (เช่น ticket-laibz9-1, ticket-ggerg-2)
      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
      const channelName = `ticket-${cleanUsername}-${ticketNum}`;

      // 5. ตรวจสอบหรือสร้าง Ticket Category อัตโนมัติหากยังไม่มี
      let parentCategoryId = null;

      if (settings.ticketCategoryId) {
        const categoryChannel = guild.channels.cache.get(settings.ticketCategoryId) || 
                                await guild.channels.fetch(settings.ticketCategoryId).catch(() => null);
        if (categoryChannel && categoryChannel.type === ChannelType.GuildCategory) {
          parentCategoryId = categoryChannel.id;
        }
      }

      // ถ้าไม่มีตามการตั้งค่า ให้ค้นหา Category ที่มีชื่อ "TICKETS" หรือ "ทิกเก็ต"
      if (!parentCategoryId) {
        const existingCat = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && (c.name.toUpperCase().includes('TICKET') || c.name.includes('ทิกเก็ต'))
        );
        if (existingCat) {
          parentCategoryId = existingCat.id;
          if (typeof updateGuildSettings === 'function') {
            await updateGuildSettings(guild.id, { ticketCategoryId: existingCat.id });
          }
        }
      }

      // หากในเซิร์ฟเวอร์ยังไม่มี Category Ticket เลย ให้บอทสร้าง Category "🎫 TICKETS" อัตโนมัติ!
      if (!parentCategoryId) {
        try {
          const newCategory = await guild.channels.create({
            name: '🎫 TICKETS',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: botMember.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.SendMessages
                ]
              }
            ],
            reason: 'สร้าง Category สำหรับระบบ Ticket อัตโนมัติ'
          });

          parentCategoryId = newCategory.id;
          if (typeof updateGuildSettings === 'function') {
            await updateGuildSettings(guild.id, { ticketCategoryId: newCategory.id });
          }
          logger.success(`[Ticket System] สร้าง Category "${newCategory.name}" อัตโนมัติสำเร็จในเซิร์ฟเวอร์ ${guild.name}`);
        } catch (catErr) {
          logger.warn(`[Ticket System] ไม่สามารถสร้าง Category อัตโนมัติได้: ${catErr.message}`);
        }
      }

      // 6. สร้างห้องทิกเก็ตใน Category
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentCategoryId,
        topic: `Ticket Opener: ${user.id} | Ticket #${ticketNum} | Created by ${user.tag}`,
        permissionOverwrites: permissionOverwrites,
        reason: `เปิด Ticket #${ticketNum} โดย ${user.tag}`
      });

      // 6. ส่งข้อความต้อนรับในห้องทิกเก็ต
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
          `*ทีมงานจะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ เมื่อเสร็จสิ้นสามารถกดปุ่ม **"🔒 ปิดตั๋ว"** ด้านล่างได้ทันที*`
        )
        .setColor(config.colors.accent || '#00F0FF')
        .setFooter({
          text: `Ticket ID: ${ticketChannel.id} • ${guild.name}`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId('btn_close_ticket')
        .setLabel('🔒 ปิดตั๋ว (Close Ticket)')
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(closeButton);

      await ticketChannel.send({
        content: `👋 ยินดีต้อนรับ ${user} | ทีมงานจะเข้ามาให้บริการในไม่ช้า`,
        embeds: [welcomeEmbed],
        components: [actionRow]
      });

      logger.success(`สร้างห้องทิกเก็ต #${ticketChannel.name} สำเร็จสำหรับผู้ใช้ ${user.tag}`);

      // 7. แจ้งกลับผู้ใช้งาน
      await interaction.editReply({
        content: `✅ เปิดห้องทิกเก็ตของคุณเรียบร้อยแล้ว: ${ticketChannel}`
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดในการเปิด Ticket:', error);
      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', `ไม่สามารถสร้างห้องทิกเก็ตได้: ${error.message}`);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
