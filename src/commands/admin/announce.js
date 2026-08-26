/**
 * @file src/commands/admin/announce.js
 * @description Slash Command สำหรับสร้างประกาศข่าวสารแบบ Embed พรีเมียม (/announce)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const colorMap = {
  purple: '#9B59B6',
  blue: '#3498DB',
  gold: '#F1C40F',
  green: '#2ECC71',
  red: '#ED4245',
  dark: '#2B2D31'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('สร้างประกาศข่าวสารแบบ Embed พรีเมียม (เฉพาะเจ้าของเซิร์ฟเวอร์หรือ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('หัวข้อของประกาศ')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('เนื้อหาของประกาศ (สามารถใช้ \\n เพื่อขึ้นบรรทัดใหม่ได้)')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่องที่ต้องการส่งประกาศ (หากไม่ระบุจะส่งในช่องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('mention')
        .setDescription('การแท็กสมาชิกในประกาศ')
        .setRequired(false)
        .addChoices(
          { name: '📢 ไม่แท็ก (None)', value: 'none' },
          { name: '🔔 แท็ก @everyone', value: 'everyone' },
          { name: '📍 แท็ก @here', value: 'here' }
        )
    )
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('โทนสีของขอบ Embed ประกาศ')
        .setRequired(false)
        .addChoices(
          { name: '💜 สีม่วง (Purple)', value: 'purple' },
          { name: '💙 สีฟ้า/น้ำเงิน (Blue)', value: 'blue' },
          { name: '💛 สีทอง (Gold)', value: 'gold' },
          { name: '💚 สีเขียว (Green)', value: 'green' },
          { name: '❤️ สีแดง (Red)', value: 'red' }
        )
    )
    .addStringOption(option =>
      option
        .setName('image_url')
        .setDescription('ลิงก์รูปภาพแบนเนอร์ขนาดใหญ่ด้านล่างประกาศ (URL)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('thumbnail_url')
        .setDescription('ลิงก์รูปภาพไอคอนขนาดเล็กมุมขวาบน (URL)')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /announce
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const member = interaction.member;

      // 0. ตรวจสอบสิทธิ์ (Owner / Leader / Admin)
      const isServerOwner = guild.ownerId === member.id;
      const isLeader = config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId);
      const isSystemAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isServerOwner && !isLeader && !isSystemAdmin) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์ไม่เพียงพอ',
          'คำสั่ง **/announce** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const title = interaction.options.getString('title');
      let messageContent = interaction.options.getString('message');
      // แปลง \n เป็น newline จริง
      messageContent = messageContent.replace(/\\n/g, '\n');

      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const mentionType = interaction.options.getString('mention') || 'none';
      const colorChoice = interaction.options.getString('color') || 'purple';
      const imageUrl = interaction.options.getString('image_url');
      const thumbnailUrl = interaction.options.getString('thumbnail_url');

      const botMember = guild.members.me;

      // 1. ตรวจสอบสิทธิ์ของบอทในช่องเป้าหมาย
      const permissions = targetChannel.permissionsFor(botMember);
      if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${targetChannel}`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // 2. สร้าง Embed ประกาศ
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${guild.name} • ประกาศข่าวสาร`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`📢 ${title}`)
        .setDescription(messageContent)
        .setColor(colorMap[colorChoice] || config.colors.primary)
        .setFooter({
          text: `ประกาศโดย ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        embed.setImage(imageUrl);
      }

      if (thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))) {
        embed.setThumbnail(thumbnailUrl);
      }

      // 3. กำหนดข้อความแท็ก
      let mentionText = '';
      if (mentionType === 'everyone') {
        mentionText = '@everyone';
      } else if (mentionType === 'here') {
        mentionText = '@here';
      }

      // 4. ส่งประกาศไปยังช่องเป้าหมาย
      await targetChannel.send({
        content: mentionText || undefined,
        embeds: [embed]
      });

      logger.success(`ส่งประกาศ "${title}" ไปยังช่อง #${targetChannel.name} สำเร็จโดย ${interaction.user.tag}`);

      // 5. ส่งบันทึก Audit Log
      await sendModActionLog(guild, {
        action: '📢 ส่งประกาศข่าวสาร (Server Announcement)',
        target: { tag: `#${targetChannel.name}`, id: targetChannel.id },
        moderator: interaction.user,
        reason: `หัวข้อ: ${title} ในช่อง ${targetChannel}`,
        color: colorMap[colorChoice] || config.colors.info
      });

      // 6. ตอบกลับผู้ใช้งาน
      await interaction.reply({
        content: `✅ ส่งประกาศข่าวสารไปยังช่อง ${targetChannel} เรียบร้อยแล้วครับ`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /announce:', error);
      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
