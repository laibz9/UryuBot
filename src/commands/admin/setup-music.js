/**
 * @file src/commands/admin/setup-music.js
 * @description Slash Command สำหรับตั้งค่าห้องขอเพลงและแผงเครื่องเล่นเพลงถาวร (/setup-music)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { createStandbyEmbed, panelMessages } = require('../../utils/musicManager');
const { createErrorEmbed } = require('../../utils/embeds');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-music')
    .setDescription('สร้างหรือกำหนดห้องขอเพลงพร้อมแผงเครื่องเล่นเพลงถาวร (เฉพาะ Server Owner หรือ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('เลือกช่องที่มีอยู่แล้ว (หากไม่ระบุ บอทจะสร้างห้องใหม่ให้โดยอัตโนมัติ)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /setup-music
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const member = interaction.member;

      // ตรวจสอบสิทธิ์
      const isServerOwner = guild.ownerId === member.id;
      const isLeader = config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId);
      const isSystemAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isServerOwner && !isLeader && !isSystemAdmin) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์ไม่เพียงพอ',
          'คำสั่ง **/setup-music** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      let targetChannel = interaction.options.getChannel('channel');

      // หากไม่ได้เลือกช่อง ให้สร้างห้องใหม่
      if (!targetChannel) {
        targetChannel = await guild.channels.create({
          name: 'ขอเพลง-music',
          type: ChannelType.GuildText,
          topic: '🎵 ห้องสำหรับขอเพลงอัตโนมัติ • พิมพ์ชื่อเพลงหรือแปะลิงก์ในช่องนี้เพื่อเล่นเพลงได้ทันที',
          reason: `ตั้งค่าระบบห้องขอเพลงโดย ${interaction.user.tag}`
        });
      }

      // สร้าง Standby Embed
      const standbyEmbed = createStandbyEmbed(guild);

      // ส่งแผงควบคุมเพลงเริ่มต้น
      const panelMessage = await targetChannel.send({
        embeds: [standbyEmbed]
      });

      // บันทึก Message ID และ Channel ID ใน Memory และ MySQL
      panelMessages.set(guild.id, panelMessage.id);
      const { updateGuildSettings } = require('../../database/db');
      await updateGuildSettings(guild.id, { musicChannelId: targetChannel.id });

      logger.success(`ตั้งค่าห้องขอเพลง #${targetChannel.name} และบันทึกลง MySQL สำเร็จ`);

      await sendModActionLog(guild, {
        action: '🎵 ตั้งค่าห้องขอเพลง (Music Setup)',
        target: { tag: `#${targetChannel.name}`, id: targetChannel.id },
        moderator: interaction.user,
        reason: `ตั้งค่าช่องขอเพลงพร้อมแผงควบคุมถาวร`,
        color: config.colors.accent
      });

      const { EmbedBuilder } = require('discord.js');
      const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ ติดตั้งห้องขอเพลงและแผงควบคุมสำเร็จ')
        .setDescription(
          `บอทได้ติดตั้งแผงควบคุมเพลงถาวรในช่อง ${targetChannel} เรียบร้อยแล้วครับ\n\n` +
          `💡 **นำ ID ไปใส่ในไฟล์ \`.env\` เพื่อให้บอทจำช่องนี้ได้ถาวร:**\n` +
          `\`\`\`env\n` +
          `MUSIC_CHANNEL_ID=${targetChannel.id}\n` +
          `\`\`\`\n` +
          `*คุณสามารถเปลี่ยนชื่อช่องหรือย้ายหมวดหมู่ได้ตามใจชอบ บอทจะจดจำจาก ID เสมอครับ*`
        )
        .setColor(config.colors.success)
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-music:', error);
      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
