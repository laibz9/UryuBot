/**
 * @file src/commands/moderation/lockdown.js
 * @description Slash Command สำหรับระบบล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน / ปลดล็อกดาวน์ (/lockdown)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { sendModActionLog } = require('../../utils/auditLogger');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('ระบบล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน / ปลดล็อกดาวน์ (เฉพาะผู้ดูแลระบบ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('เลือกเปิดใช้งานการล็อกดาวน์ หรือปลดล็อกดาวน์')
        .setRequired(true)
        .addChoices(
          { name: '🚨 ล็อกดาวน์ (Lockdown ON)', value: 'on' },
          { name: '🔓 ปลดล็อกดาวน์ (Lockdown OFF)', value: 'off' }
        )
    )
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('ขอบเขตการล็อกดาวน์ (เฉพาะช่องปัจจุบัน หรือ ทุกช่องในเซิร์ฟเวอร์)')
        .setRequired(false)
        .addChoices(
          { name: '🌐 ทั้งเซิร์ฟเวอร์ (All Channels)', value: 'all' },
          { name: '📍 เฉพาะช่องปัจจุบัน (Current Channel)', value: 'current' }
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('เหตุผลในการล็อกดาวน์ / ปลดล็อกดาวน์')
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /lockdown
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const member = interaction.member;
      const botMember = guild.members.me;

      // 0. ตรวจสอบสิทธิ์ผู้ใช้ (Server Owner, Leader, Admin หรือ ManageChannels)
      const isServerOwner = guild.ownerId === member.id;
      const isLeader = config.bot.leaderRoleId && member.roles.cache.has(config.bot.leaderRoleId);
      const isAdmin = config.bot.adminRoleId && member.roles.cache.has(config.bot.adminRoleId);
      const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                            member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isServerOwner && !isLeader && !isAdmin && !hasPermission) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์ไม่เพียงพอ',
          'คำสั่ง **/lockdown** อนุญาตให้ใช้งานได้เฉพาะ **ผู้ดูแลระบบ (Admin)** หรือ **หัวหน้า (Leader)** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบสิทธิ์ของบอท
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels) && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
        const errEmbed = createErrorEmbed(
          'สิทธิ์บอทไม่เพียงพอ',
          'บอทต้องการสิทธิ์ **Manage Channels (จัดการช่อง)** เพื่อตั้งค่าล็อกดาวน์ช่องข้อความครับ'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      const mode = interaction.options.getString('mode');
      const scope = interaction.options.getString('scope') || 'all';
      const reason = interaction.options.getString('reason') || (mode === 'on' ? 'มีเหตุด่วนหรือการก่อกวนความสงบ' : 'สถานการณ์กลับสู่สภาวะปกติ');

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // ดึง Role ที่ต้องการจำกัดสิทธิ์ (@everyone และ Verified Role ถ้ามี)
      const everyoneRole = guild.roles.everyone;
      const verifiedRole = config.bot.verifiedRoleId ? guild.roles.cache.get(config.bot.verifiedRoleId) : null;

      if (scope === 'current') {
        // ล็อกดาวน์เฉพาะช่องปัจจุบัน
        const targetChannel = interaction.channel;

        if (mode === 'on') {
          // ปิดสิทธิ์การพิมพ์
          await targetChannel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
            SendMessagesInThreads: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            AddReactions: false
          }, { reason: `[Lockdown ON] โดย ${interaction.user.tag}: ${reason}` });

          if (verifiedRole) {
            await targetChannel.permissionOverwrites.edit(verifiedRole, {
              SendMessages: false,
              SendMessagesInThreads: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false,
              AddReactions: false
            }, { reason: `[Lockdown ON] โดย ${interaction.user.tag}: ${reason}` });
          }

          // ส่ง Embed แจ้งเตือนฉุกเฉินในช่อง
          const alertEmbed = new EmbedBuilder()
            .setTitle('🚨 ประกาศล็อกดาวน์ช่องแชทชั่วคราว (Lockdown Active)')
            .setDescription(
              `ช่องนี้ได้รับการล็อกดาวน์โดยทีมงาน เพื่อควบคุมสถานการณ์และความสงบเรียบร้อย\n\n` +
              `📌 **เหตุผล:** \`${reason}\`\n` +
              `🛡️ **ผู้ดำเนินการ:** ${interaction.user}\n\n` +
              `*สมาชิกทั่วไปจะไม่สามารถส่งข้อความได้ชั่วคราว จนกว่าจะมีประกาศปลดล็อกดาวน์ครับ*`
            )
            .setColor(config.colors.danger)
            .setFooter({ text: `${guild.name} • Security System`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          await targetChannel.send({ embeds: [alertEmbed] });

          // บันทึกลง Mod Action Logs
          await sendModActionLog(guild, {
            action: '🚨 ล็อกดาวน์ช่องแชท (Channel Lockdown)',
            target: { tag: `#${targetChannel.name}`, id: targetChannel.id },
            moderator: interaction.user,
            reason: reason,
            color: config.colors.danger
          });

          const successEmbed = createSuccessEmbed(
            'ล็อกดาวน์สำเร็จ',
            `ทำการล็อกดาวน์ช่อง ${targetChannel} เรียบร้อยแล้วครับ`
          );
          return await interaction.editReply({ embeds: [successEmbed] });
        } else {
          // ปลดล็อกดาวน์
          await targetChannel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null,
            SendMessagesInThreads: null,
            CreatePublicThreads: null,
            CreatePrivateThreads: null,
            AddReactions: null
          }, { reason: `[Lockdown OFF] โดย ${interaction.user.tag}: ${reason}` });

          if (verifiedRole) {
            await targetChannel.permissionOverwrites.edit(verifiedRole, {
              SendMessages: null,
              SendMessagesInThreads: null,
              CreatePublicThreads: null,
              CreatePrivateThreads: null,
              AddReactions: null
            }, { reason: `[Lockdown OFF] โดย ${interaction.user.tag}: ${reason}` });
          }

          // ส่ง Embed ปลดล็อกดาวน์ในช่อง
          const unlockEmbed = new EmbedBuilder()
            .setTitle('🔓 ประกาศปลดล็อกดาวน์ช่องแชท (Lockdown Lifted)')
            .setDescription(
              `ช่องนี้ได้รับการปลดล็อกดาวน์เรียบร้อยแล้ว สมาชิกสามารถพูดคุยได้ตามปกติครับ\n\n` +
              `📌 **เหตุผล:** \`${reason}\`\n` +
              `🛡️ **ผู้ดำเนินการ:** ${interaction.user}\n\n` +
              `*ขอขอบคุณสมาชิกทุกคนที่ให้ความร่วมมือครับ*`
            )
            .setColor(config.colors.success)
            .setFooter({ text: `${guild.name} • Security System`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          await targetChannel.send({ embeds: [unlockEmbed] });

          // บันทึกลง Mod Action Logs
          await sendModActionLog(guild, {
            action: '🔓 ปลดล็อกดาวน์ช่องแชท (Channel Unlock)',
            target: { tag: `#${targetChannel.name}`, id: targetChannel.id },
            moderator: interaction.user,
            reason: reason,
            color: config.colors.success
          });

          const successEmbed = createSuccessEmbed(
            'ปลดล็อกดาวน์สำเร็จ',
            `ทำการปลดล็อกดาวน์ช่อง ${targetChannel} เรียบร้อยแล้วครับ`
          );
          return await interaction.editReply({ embeds: [successEmbed] });
        }
      } else {
        // ล็อกดาวน์ทั้งเซิร์ฟเวอร์ (All Text Channels)
        const textChannels = guild.channels.cache.filter(
          c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
               c.id !== config.bot.logChannelId
        );

        let affectedCount = 0;

        for (const [channelId, channel] of textChannels) {
          try {
            if (mode === 'on') {
              await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                AddReactions: false
              }, { reason: `[Server Lockdown ON] โดย ${interaction.user.tag}: ${reason}` });

              if (verifiedRole) {
                await channel.permissionOverwrites.edit(verifiedRole, {
                  SendMessages: false,
                  SendMessagesInThreads: false,
                  CreatePublicThreads: false,
                  CreatePrivateThreads: false,
                  AddReactions: false
                }, { reason: `[Server Lockdown ON] โดย ${interaction.user.tag}: ${reason}` });
              }
            } else {
              await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                SendMessagesInThreads: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null,
                AddReactions: null
              }, { reason: `[Server Lockdown OFF] โดย ${interaction.user.tag}: ${reason}` });

              if (verifiedRole) {
                await channel.permissionOverwrites.edit(verifiedRole, {
                  SendMessages: null,
                  SendMessagesInThreads: null,
                  CreatePublicThreads: null,
                  CreatePrivateThreads: null,
                  AddReactions: null
                }, { reason: `[Server Lockdown OFF] โดย ${interaction.user.tag}: ${reason}` });
              }
            }
            affectedCount++;
          } catch (err) {
            logger.warn(`ไม่สามารถปรับสิทธิ์ช่อง #${channel.name}:`, err.message);
          }
        }

        // ส่งข้อความประกาศในช่องที่เรียกใช้คำสั่ง
        if (mode === 'on') {
          const globalAlertEmbed = new EmbedBuilder()
            .setTitle('🚨 ประกาศล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (Server Lockdown ON)')
            .setDescription(
              `⚠️ **เซิร์ฟเวอร์ถูกล็อกดาวน์ทั้งระบบโดยทีมงาน** เพื่อความปลอดภัยและความสงบเรียบร้อย\n\n` +
              `📌 **เหตุผล:** \`${reason}\`\n` +
              `🛡️ **ผู้ดำเนินการ:** ${interaction.user}\n` +
              `📊 **จำนวนช่องที่ล็อกดาวน์:** \`${affectedCount}\` ช่อง\n\n` +
              `*สมาชิกทุกคนจะไม่สามารถส่งข้อความได้ชั่วคราว กรุณารอประกาศเพิ่มเติมจากทีมงานครับ*`
            )
            .setColor(config.colors.danger)
            .setFooter({ text: `${guild.name} • Server Emergency System`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          await interaction.channel.send({ embeds: [globalAlertEmbed] });

          // บันทึกลง Audit Log
          await sendModActionLog(guild, {
            action: '🚨 ล็อกดาวน์เซิร์ฟเวอร์ทั้งระบบ (Server Lockdown)',
            target: { tag: `${guild.name}`, id: guild.id },
            moderator: interaction.user,
            reason: reason,
            details: [
              { name: '📊 จำนวนช่องที่ถูกล็อก', value: `\`${affectedCount}\` ช่อง`, inline: true }
            ],
            color: config.colors.danger
          });

          logger.warn(`[Lockdown ON] เซิร์ฟเวอร์ ${guild.name} ถูกล็อกดาวน์ ${affectedCount} ช่อง โดย ${interaction.user.tag}`);

          const successEmbed = createSuccessEmbed(
            'ล็อกดาวน์ทั้งเซิร์ฟเวอร์สำเร็จ',
            `ทำการปิดสิทธิ์การส่งข้อความทั้งหมด \`${affectedCount}\` ช่องเรียบร้อยแล้วครับ`
          );
          return await interaction.editReply({ embeds: [successEmbed] });
        } else {
          const globalUnlockEmbed = new EmbedBuilder()
            .setTitle('🔓 ประกาศปลดล็อกดาวน์เซิร์ฟเวอร์ (Server Lockdown Lifted)')
            .setDescription(
              `🎉 **เซิร์ฟเวอร์ได้รับการปลดล็อกดาวน์ทั้งระบบเรียบร้อยแล้ว**\n\n` +
              `📌 **เหตุผล:** \`${reason}\`\n` +
              `🛡️ **ผู้ดำเนินการ:** ${interaction.user}\n` +
              `📊 **จำนวนช่องที่ปลดล็อก:** \`${affectedCount}\` ช่อง\n\n` +
              `*สมาชิกสามารถพูดคุยและใช้งานห้องต่างๆ ได้ตามปกติ ขอขอบคุณทุกคนที่ให้ความร่วมมือครับ*`
            )
            .setColor(config.colors.success)
            .setFooter({ text: `${guild.name} • Server Emergency System`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          await interaction.channel.send({ embeds: [globalUnlockEmbed] });

          // บันทึกลง Audit Log
          await sendModActionLog(guild, {
            action: '🔓 ปลดล็อกดาวน์เซิร์ฟเวอร์ทั้งระบบ (Server Unlock)',
            target: { tag: `${guild.name}`, id: guild.id },
            moderator: interaction.user,
            reason: reason,
            details: [
              { name: '📊 จำนวนช่องที่ปลดล็อก', value: `\`${affectedCount}\` ช่อง`, inline: true }
            ],
            color: config.colors.success
          });

          logger.success(`[Lockdown OFF] เซิร์ฟเวอร์ ${guild.name} ได้รับการปลดล็อกดาวน์ ${affectedCount} ช่อง โดย ${interaction.user.tag}`);

          const successEmbed = createSuccessEmbed(
            'ปลดล็อกดาวน์ทั้งเซิร์ฟเวอร์สำเร็จ',
            `ทำการคืนสิทธิ์การส่งข้อความทั้งหมด \`${affectedCount}\` ช่องเรียบร้อยแล้วครับ`
          );
          return await interaction.editReply({ embeds: [successEmbed] });
        }
      }
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /lockdown:', error);
      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
