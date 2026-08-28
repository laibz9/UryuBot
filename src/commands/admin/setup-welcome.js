/**
 * @file src/commands/admin/setup-welcome.js
 * @description Slash Command สำหรับตั้งค่าช่องแจ้งเตือนต้อนรับและบอกลาสมาชิก (/setup-welcome)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { createWelcomeEmbed, createGoodbyeEmbed, createErrorEmbed } = require('../../utils/embeds');
const { getGuildSettings, updateGuildSettings } = require('../../database/db');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('ตั้งค่าช่องต้อนรับและบอกลาสมาชิก (หากไม่ระบุช่อง บอทจะใช้ช่องเดิมหรือสร้างใหม่อัตโนมัติ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('welcome_channel')
        .setDescription('ช่อง (Channel) สำหรับส่งข้อความต้อนรับสมาชิกใหม่ (ไม่ระบุ = ใช้ช่องในระบบ/สร้างใหม่)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('goodbye_channel')
        .setDescription('ช่อง (Channel) สำหรับส่งข้อความแจ้งเตือนเมื่อสมาชิกออก (ไม่ระบุ = ใช้ช่องต้อนรับ)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('เปิดหรือปิดการใช้งานระบบต้อนรับและบอกลาสมาชิก')
        .setRequired(false)
        .addChoices(
          { name: '🟢 เปิดใช้งานระบบ (Enable)', value: 'enable' },
          { name: '🔴 ปิดใช้งานระบบ (Disable)', value: 'disable' }
        )
    ),

  /**
   * ประมวลผลคำสั่ง /setup-welcome
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
          'คำสั่ง **/setup-welcome** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const status = interaction.options.getString('status');

      // หากเลือกปิดใช้งานระบบ
      if (status === 'disable') {
        await updateGuildSettings(guild.id, { enableWelcomeSystem: false });
        const disableEmbed = new EmbedBuilder()
          .setTitle('🔴 ปิดใช้งานระบบต้อนรับเรียบร้อย!')
          .setDescription('ระบบต้อนรับและบอกลาถูกปิดใช้งานแล้ว และบันทึกลงฐานข้อมูล MySQL เรียบร้อยครับ')
          .setColor(config.colors.danger)
          .setTimestamp();
        return await interaction.editReply({ embeds: [disableEmbed] });
      }

      // ดึงการตั้งค่าปัจจุบันจาก DB
      const currentSettings = getGuildSettings(guild.id);

      // 1. ค้นหาหรือสร้างช่องต้อนรับ (Welcome Channel)
      let welcomeChannel = interaction.options.getChannel('welcome_channel');

      if (!welcomeChannel && currentSettings.welcomeChannelId) {
        welcomeChannel = guild.channels.cache.get(currentSettings.welcomeChannelId) || 
          await guild.channels.fetch(currentSettings.welcomeChannelId).catch(() => null);
      }

      if (!welcomeChannel) {
        welcomeChannel = guild.channels.cache.find(c => 
          c.type === ChannelType.GuildText && (c.name.includes('welcome') || c.name.includes('ต้อนรับ'))
        );
      }

      if (!welcomeChannel) {
        welcomeChannel = await guild.channels.create({
          name: 'welcome-leave',
          type: ChannelType.GuildText,
          topic: '👋 ยินดีต้อนรับสมาชิกใหม่และแจ้งเตือนการเข้า-ออกจากเซิร์ฟเวอร์',
          reason: `สร้างช่องต้อนรับอัตโนมัติโดย ${interaction.user.tag}`
        });
      }

      // 2. ค้นหาช่องบอกลา (Goodbye Channel)
      let goodbyeChannel = interaction.options.getChannel('goodbye_channel');

      if (!goodbyeChannel && currentSettings.goodbyeChannelId) {
        goodbyeChannel = guild.channels.cache.get(currentSettings.goodbyeChannelId) || 
          await guild.channels.fetch(currentSettings.goodbyeChannelId).catch(() => null);
      }

      if (!goodbyeChannel) {
        goodbyeChannel = welcomeChannel;
      }

      // 3. บันทึกลง MySQL & In-Memory Cache ทันที
      await updateGuildSettings(guild.id, {
        welcomeChannelId: welcomeChannel.id,
        goodbyeChannelId: goodbyeChannel.id,
        enableWelcomeSystem: true
      });

      // 4. ส่งข้อความตัวอย่างทดสอบ
      const botMember = guild.members.me;
      const welcomePerms = welcomeChannel.permissionsFor(botMember);
      if (welcomePerms && welcomePerms.has(PermissionFlagsBits.SendMessages) && welcomePerms.has(PermissionFlagsBits.EmbedLinks)) {
        try {
          const testWelcomeEmbed = createWelcomeEmbed(interaction.member);
          await welcomeChannel.send({
            content: '📌 **[ตัวอย่างระบบต้อนรับ]**',
            embeds: [testWelcomeEmbed]
          });
        } catch (e) {
          logger.warn('ไม่สามารถส่งตัวอย่างต้อนรับได้:', e.message);
        }
      }

      if (goodbyeChannel.id !== welcomeChannel.id) {
        const goodbyePerms = goodbyeChannel.permissionsFor(botMember);
        if (goodbyePerms && goodbyePerms.has(PermissionFlagsBits.SendMessages) && goodbyePerms.has(PermissionFlagsBits.EmbedLinks)) {
          try {
            const testGoodbyeEmbed = createGoodbyeEmbed(interaction.user, guild.memberCount - 1, guild);
            await goodbyeChannel.send({
              content: '📌 **[ตัวอย่างระบบบอกลา]**',
              embeds: [testGoodbyeEmbed]
            });
          } catch (e) {
            logger.warn('ไม่สามารถส่งตัวอย่างบอกลาได้:', e.message);
          }
        }
      }

      logger.success(`ตั้งค่าช่องต้อนรับ (#${welcomeChannel.name}) สำเร็จใน ${guild.name} โดย ${interaction.user.tag}`);

      // 5. ส่ง Embed สรุปผลกลับผู้ใช้
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ ตั้งค่าระบบต้อนรับและบอกลาสำเร็จ!')
        .setDescription(
          `บอทได้ทำการเชื่อมต่อและบันทึกช่องต้อนรับลงฐานข้อมูลเรียบร้อยแล้วครับ\n\n` +
          `📢 **ช่องต้อนรับ (Welcome):** ${welcomeChannel}\n` +
          `👋 **ช่องบอกลา (Goodbye):** ${goodbyeChannel}\n` +
          `🟢 **สถานะ:** เปิดใช้งาน (Active)\n\n` +
          `💡 *หากต้องการเปลี่ยนช่องในภายหลัง สามารถเลือกผ่านคำสั่งหรือ Web Dashboard ได้ทันทีครับ*`
        )
        .setColor(config.colors.success)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-welcome:', error);

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
