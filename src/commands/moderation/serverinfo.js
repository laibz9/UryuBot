/**
 * @file src/commands/moderation/serverinfo.js
 * @description Slash Command สำหรับแสดงข้อมูลและสถิติของเซิร์ฟเวอร์ (/serverinfo)
 */

const { SlashCommandBuilder, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('ตรวจสอบข้อมูลและรายละเอียดของเซิร์ฟเวอร์')
    .setDMPermission(false),

  /**
   * ประมวลผลคำสั่ง /serverinfo
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      await guild.members.fetch(); // ดึงสมาชิกครบทุกไอดีเพื่อสถิติที่แม่นยำ

      const owner = await guild.fetchOwner().catch(() => null);
      const iconURL = guild.iconURL({ dynamic: true, size: 512 });
      const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

      // นับจำนวนสมาชิกแยกประเภท
      const totalMembers = guild.memberCount;
      const botMembers = guild.members.cache.filter(member => member.user.bot).size;
      const humanMembers = totalMembers - botMembers;

      // นับจำนวนช่องประเภทต่างๆ
      const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
      const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

      // นับจำนวนยศและอีโมจิ
      const roleCount = guild.roles.cache.size - 1; // ไม่นับ @everyone
      const emojiCount = guild.emojis.cache.size;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `ข้อมูลเซิร์ฟเวอร์ • ${guild.name}`,
          iconURL: iconURL
        })
        .setTitle(`🏰 ${guild.name}`)
        .setThumbnail(iconURL)
        .setColor(config.colors.accent)
        .addFields(
          {
            name: '👑 ข้อมูลทั่วไป (General)',
            value: `▸ **เจ้าของเซิร์ฟเวอร์:** ${owner ? owner.user.tag : 'ไม่ทราบ'}\n` +
                   `▸ **Server ID:** \`${guild.id}\` \n` +
                   `▸ **สร้างเมื่อ:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`,
            inline: false
          },
          {
            name: '👥 สมาชิกทั้งหมด (Members)',
            value: `▸ **ทั้งหมด:** \`${totalMembers}\` คน\n` +
                   `▸ **คน:** \`${humanMembers}\` คน\n` +
                   `▸ **บอท:** \`${botMembers}\` ตัว`,
            inline: true
          },
          {
            name: '💬 ช่องสนทนา (Channels)',
            value: `▸ **ข้อความ:** \`${textChannels}\` ช่อง\n` +
                   `▸ **เสียง:** \`${voiceChannels}\` ช่อง\n` +
                   `▸ **หมวดหมู่:** \`${categoryChannels}\` หมวด`,
            inline: true
          },
          {
            name: '🚀 สถานะ Boost & อื่นๆ',
            value: `▸ **ระดับ Boost:** Level ${guild.premiumTier}\n` +
                   `▸ **จำนวน Boost:** \`${guild.premiumSubscriptionCount || 0}\` ครั้ง\n` +
                   `▸ **ยศทั้งหมด:** \`${roleCount}\` ยศ | **อีโมจิ:** \`${emojiCount}\` รูป`,
            inline: false
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /serverinfo:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการดึงข้อมูลเซิร์ฟเวอร์',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
