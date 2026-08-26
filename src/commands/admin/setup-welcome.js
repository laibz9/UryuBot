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
const { checkCommandPermission } = require('../../utils/permissions');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('ตั้งค่าช่องต้อนรับและบอกลาสมาชิก (เฉพาะเจ้าของเซิร์ฟเวอร์)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('welcome_channel')
        .setDescription('ช่อง (Channel) สำหรับส่งข้อความต้อนรับสมาชิกใหม่')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('goodbye_channel')
        .setDescription('ช่อง (Channel) สำหรับส่งข้อความแจ้งเตือนเมื่อสมาชิกออก (หากไม่ระบุจะใช้ช่องต้อนรับ)')
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

      const status = interaction.options.getString('status');

      // หากเลือกปิดใช้งานระบบ
      if (status === 'disable') {
        config.bot.enableWelcomeSystem = false;
        const disableEmbed = new EmbedBuilder()
          .setTitle('🔴 ปิดใช้งานระบบต้อนรับเรียบร้อย!')
          .setDescription('ระบบต้อนรับและบอกลาถูกปิดใช้งานแล้ว บอทจะไม่ส่งข้อความเมื่อมีคนเข้าหรือออกจากเซิร์ฟเวอร์\n\n*(คุณสามารถเปลี่ยนเป็น ENABLE_WELCOME_SYSTEM=false ในไฟล์ .env ได้เช่นกัน)*')
          .setColor(config.colors.danger)
          .setTimestamp();
        return await interaction.reply({ embeds: [disableEmbed], flags: MessageFlags.Ephemeral });
      }

      // หากเลือกเปิดใช้งาน
      config.bot.enableWelcomeSystem = true;

      const welcomeChannel = interaction.options.getChannel('welcome_channel') || interaction.channel;
      const goodbyeChannel = interaction.options.getChannel('goodbye_channel') || welcomeChannel;
      const botMember = guild.members.me;

      // 1. ตรวจสอบสิทธิ์ของบอทในช่องต้อนรับ
      const welcomePerms = welcomeChannel.permissionsFor(botMember);
      if (!welcomePerms.has(PermissionFlagsBits.SendMessages) || !welcomePerms.has(PermissionFlagsBits.EmbedLinks)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${welcomeChannel}`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 2. ส่ง Embed ตัวอย่างต้อนรับไปยังช่องที่เลือก
      const testWelcomeEmbed = createWelcomeEmbed(interaction.member);
      await welcomeChannel.send({
        content: '📌 **[ตัวอย่างระบบต้อนรับ]**',
        embeds: [testWelcomeEmbed]
      });

      // 3. หากตั้งค่าช่องบอกลาแยกลิบลับ ให้ส่งตัวอย่างบอกลาไปยังช่องนั้น
      if (goodbyeChannel.id !== welcomeChannel.id) {
        const goodbyePerms = goodbyeChannel.permissionsFor(botMember);
        if (goodbyePerms.has(PermissionFlagsBits.SendMessages) && goodbyePerms.has(PermissionFlagsBits.EmbedLinks)) {
          const testGoodbyeEmbed = createGoodbyeEmbed(interaction.user, guild.memberCount - 1, guild);
          await goodbyeChannel.send({
            content: '📌 **[ตัวอย่างระบบบอกลา]**',
            embeds: [testGoodbyeEmbed]
          });
        }
      }

      logger.success(`ตั้งค่าช่องต้อนรับ (${welcomeChannel.name}) สำเร็จใน ${guild.name} โดย ${interaction.user.tag}`);

      // 4. ส่ง Embed สรุปการตั้งค่ากลับผู้ใช้งานคำสั่ง
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ ตั้งค่าระบบต้อนรับและบอกลาสำเร็จ!')
        .setDescription(
          `บอทได้ทำการส่งข้อความตัวอย่างทดสอบไปยังช่องที่กำหนดเรียบร้อยแล้วครับ\n\n` +
          `📢 **ช่องต้อนรับ (Welcome Channel):** ${welcomeChannel}\n` +
          `👋 **ช่องบอกลา (Goodbye Channel):** ${goodbyeChannel}\n\n` +
          `💡 **นำ ID ไปใส่ในไฟล์ \`.env\` เพื่อให้บันทึกถาวร:**\n` +
          `\`\`\`env\n` +
          `WELCOME_CHANNEL_ID=${welcomeChannel.id}\n` +
          `GOODBYE_CHANNEL_ID=${goodbyeChannel.id}\n` +
          `\`\`\``
        )
        .setColor(config.colors.success)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-welcome:', error);

      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
