/**
 * @file src/commands/moderation/userinfo.js
 * @description Slash Command สำหรับแสดงข้อมูลและรายละเอียดของสมาชิก (/userinfo)
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { resolveTargetUser, resolveTargetMember } = require('../../utils/userResolver');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('ดูข้อมูลโปรไฟล์และประวัติของสมาชิก')
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('สมาชิกที่ต้องการดูข้อมูล (หากไม่ระบุจะแสดงข้อมูลของตัวคุณเอง)')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /userinfo
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const targetUser = (await resolveTargetUser(interaction, 'user')) || interaction.user;
      const guild = interaction.guild;
      const member = await resolveTargetMember(interaction, targetUser, 'user');

      // สร้าง Embed ข้อมูลสมาชิก
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `ข้อมูลสมาชิก: ${targetUser.tag}`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setColor(config.colors.accent)
        .addFields(
          { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
          { name: '🤖 บอทหรือไม่', value: targetUser.bot ? 'ใช่' : 'ไม่ใช่', inline: true },
          {
            name: '📅 วันที่สร้างบัญชี',
            value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`,
            inline: false
          }
        );

      if (member) {
        const roles = member.roles.cache
          .filter(r => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString())
          .slice(0, 15);

        embed.addFields(
          {
            name: '📥 วันที่เข้าร่วมเซิร์ฟเวอร์',
            value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` : 'ไม่พบข้อมูล',
            inline: false
          },
          {
            name: `🏷️ ยศ (${roles.length})`,
            value: roles.length > 0 ? roles.join(', ') : 'ไม่มียศพิเศษ',
            inline: false
          }
        );
      } else {
        embed.addFields({
          name: '📥 สถานะในเซิร์ฟเวอร์',
          value: 'ไม่ได้อยู่ในเซิร์ฟเวอร์นี้',
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /userinfo:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก กรุณาลองใหม่อีกครั้ง',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
