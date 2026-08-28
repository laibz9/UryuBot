/**
 * @file src/commands/admin/send-ticket.js
 * @description Slash Command สำหรับส่งแผงเปิดตั๋วติดต่อทีมงาน (/send-ticket)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send-ticket')
    .setDescription('ส่งแผงเปิดตั๋วแจ้งปัญหา/ติดต่อทีมงาน (เฉพาะเจ้าของเซิร์ฟเวอร์หรือ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่องที่ต้องการส่งแผง Ticket (หากไม่ระบุจะส่งในช่องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /send-ticket
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const member = interaction.member;

      // ตรวจสอบสิทธิ์
      const isServerOwner = guild.ownerId === member.id;
      const isLeader = config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId);
      const isSystemAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isServerOwner && !isLeader && !isSystemAdmin) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์ไม่เพียงพอ',
          'คำสั่ง **/send-ticket** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.editReply({ embeds: [errEmbed] });
      }

      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const botMember = guild.members.me;

      // ตรวจสอบสิทธิ์บอทในช่องเป้าหมาย
      const permissions = targetChannel.permissionsFor(botMember);
      if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${targetChannel}`);
        return await interaction.editReply({ embeds: [errEmbed] });
      }

      // สร้าง Ticket Panel Embed
      const ticketEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${guild.name} • Help & Support`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle('🎫 ศูนย์บริการและติดต่อทีมงาน (Support Ticket)')
        .setDescription(
          'หากคุณต้องการความช่วยเหลือ แจ้งปัญหา พบข้อผิดพลาด หรือติดต่อสอบถามเรื่องต่างๆ\n\n' +
          '📌 **ขั้นตอนการเปิดตั๋ว:**\n' +
          '1. กดปุ่ม **"📩 เปิดตั๋วติดต่อทีมงาน"** ด้านล่าง\n' +
          '2. ระบบจะสร้างห้องแชทส่วนตัวสำหรับคุณโดยเฉพาะ\n' +
          '3. พิมพ์รายละเอียดเรื่องที่ต้องการสอบถามและรอทีมงานตอบกลับ'
        )
        .setColor(config.colors.primary)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3209/3209849.png')
        .setFooter({
          text: 'Ticket Support System',
          iconURL: config.assets.securityIcon
        })
        .setTimestamp();

      const ticketButton = new ButtonBuilder()
        .setCustomId('btn_open_ticket')
        .setLabel('เปิดตั๋วติดต่อทีมงาน (Open Ticket)')
        .setEmoji('📩')
        .setStyle(ButtonStyle.Primary);

      const actionRow = new ActionRowBuilder().addComponents(ticketButton);

      await targetChannel.send({
        embeds: [ticketEmbed],
        components: [actionRow]
      });

      logger.success(`ส่งแผง Ticket ไปยังช่อง #${targetChannel.name} สำเร็จโดย ${interaction.user.tag}`);

      await interaction.editReply({
        content: `✅ ส่งแผง Ticket ไปยังช่อง ${targetChannel} เรียบร้อยแล้วครับ`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /send-ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
