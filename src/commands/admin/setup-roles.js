/**
 * @file src/commands/admin/setup-roles.js
 * @description Slash Command สำหรับสร้างยศ Admin, Moderator และ Member พร้อมตั้งค่า สิทธิ์ (Permissions) อัตโนมัติ (/setup-roles)
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../../config/config');
const { createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('สร้างยศ Admin, Moderator และ Member พร้อมตั้งค่าสิทธิ์ให้อัตโนมัติ (เฉพาะเจ้าของเซิร์ฟเวอร์)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  /**
   * ประมวลผลคำสั่ง /setup-roles
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
          'สิทธิ์ไม่เพียงพอ (Access Denied)',
          'คำสั่ง **/setup-roles** อนุญาตให้ใช้งานได้เฉพาะ **Server Owner** หรือผู้มียศ **👑 Leader** เท่านั้น'
        );
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ตรวจสอบสิทธิ์ของบอท (ต้องมี ManageRoles และ Administrator)
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', 'บอทจำเป็นต้องมีสิทธิ์ Manage Roles เพื่อสร้างและตั้งค่ายศในเซิร์ฟเวอร์');
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const createdRoles = [];

      // 1. ตรวจสอบและสร้างยศ 👑 Leader (Owner / หัวหน้าใหญ่)
      let leaderRole = guild.roles.cache.find(r => r.name.includes('Leader') || r.name.includes('Owner'));
      if (!leaderRole) {
        leaderRole = await guild.roles.create({
          name: '👑 Leader',
          colors: 0xF1C40F, // สีทองอร่ามพรีเมียม
          permissions: [PermissionFlagsBits.Administrator],
          hoist: true, // แสดงแยกกลุ่มสมาชิก
          reason: 'สร้างยศอัตโนมัติผ่านคำสั่ง /setup-roles'
        });
        createdRoles.push(`👑 **Leader (Owner)**: \`${leaderRole.id}\` (สิทธิ์: Administrator ครบถ้วน)`);
      } else {
        createdRoles.push(`👑 **Leader (มีอยู่แล้ว)**: \`${leaderRole.id}\``);
      }

      // 2. ตรวจสอบและสร้างยศ 👑 Admin
      let adminRole = guild.roles.cache.find(r => r.name.includes('Admin'));
      if (!adminRole) {
        adminRole = await guild.roles.create({
          name: '👑 Admin',
          colors: 0xE74C3C, // สีแดงพรีเมียม
          permissions: [PermissionFlagsBits.Administrator],
          hoist: true,
          reason: 'สร้างยศอัตโนมัติผ่านคำสั่ง /setup-roles'
        });
        createdRoles.push(`👑 **Admin**: \`${adminRole.id}\` (สิทธิ์: Administrator ครบถ้วน)`);
      } else {
        createdRoles.push(`👑 **Admin (มีอยู่แล้ว)**: \`${adminRole.id}\``);
      }

      // 3. ตรวจสอบและสร้างยศ 🛠️ Moderator
      let modRole = guild.roles.cache.find(r => r.name.includes('Moderator') || r.name.includes('Mod'));
      if (!modRole) {
        modRole = await guild.roles.create({
          name: '🛠️ Moderator',
          colors: 0x3498DB, // สีฟ้าสดใส
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.MoveMembers
          ],
          hoist: true,
          reason: 'สร้างยศอัตโนมัติผ่านคำสั่ง /setup-roles'
        });
        createdRoles.push(`🛠️ **Moderator**: \`${modRole.id}\` (สิทธิ์: เตะ, แบน, ปิดแชท, ลบข้อความ)`);
      } else {
        createdRoles.push(`🛠️ **Moderator (มีอยู่แล้ว)**: \`${modRole.id}\``);
      }

      // 4. ตรวจสอบและสร้างยศ ✅ Member (สำหรับระบบยืนยันตัวตน)
      let memberRole = guild.roles.cache.find(r => r.name.includes('Member') || r.name.includes('สมาชิก'));
      if (!memberRole) {
        memberRole = await guild.roles.create({
          name: '✅ Member',
          colors: 0x2ECC71, // สีเขียวสดใส
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.UseExternalEmojis,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ],
          hoist: true,
          reason: 'สร้างยศอัตโนมัติผ่านคำสั่ง /setup-roles'
        });
        createdRoles.push(`✅ **Member**: \`${memberRole.id}\` (สิทธิ์: สมาชิกทั่วไป)`);
      } else {
        createdRoles.push(`✅ **Member (มีอยู่แล้ว)**: \`${memberRole.id}\``);
      }

      // 5. บันทึก Role IDs ลงฐานข้อมูล MySQL อัตโนมัติทันที
      const { updateGuildSettings } = require('../../database/db');
      await updateGuildSettings(guild.id, {
        leaderRoleId: leaderRole.id,
        adminRoleId: adminRole.id,
        moderatorRoleId: modRole.id,
        verifiedRoleId: memberRole.id
      });

      // 6. มอบยศ Leader และ Admin ให้แก่คนที่รันคำสั่งทันที
      if (leaderRole && botMember.roles.highest.position > leaderRole.position) {
        await member.roles.add(leaderRole).catch(() => {});
      }
      if (adminRole && botMember.roles.highest.position > adminRole.position) {
        await member.roles.add(adminRole).catch(() => {});
      }

      logger.success(`สร้างและตั้งค่ายศในเซิร์ฟเวอร์ ${guild.name} และบันทึกลง MySQL สำเร็จ`);

      // 7. สร้าง Embed รายงานผลลัพธ์พร้อมแจ้งสถานะบันทึกสำเร็จ
      const resultEmbed = new EmbedBuilder()
        .setTitle('🎉 สร้างยศและบันทึกลงฐานข้อมูล MySQL สำเร็จ!')
        .setDescription(
          'บอทได้ทำการสร้างยศ กำหนดสิทธิ์ และ **บันทึกการตั้งค่าลงฐานข้อมูล MySQL เรียบร้อยแล้ว** (ไม่ต้องไปแก้ .env เอง)\n\n' +
          '📋 **รายการยศที่บันทึกแล้ว:**\n' +
          createdRoles.join('\n') + '\n\n' +
          '💡 **คุณสามารถปรับเปลี่ยนยศเพิ่มเติมได้ตลอดเวลาผ่าน [Web Dashboard](http://localhost:3000/#dashboard)**\n\n' +
          '⚠️ **ข้อควรระวังสำคัญ:**\n' +
          'อย่าลืมไปที่ **Server Settings ➡️ Roles** แล้วลาก **ยศของบอท** ขึ้นไปอยู่ **"สูงกว่า"** ยศทั้งหมดนี้ด้วยนะครับ!'
        )
        .setColor(config.colors.success)
        .setFooter({
          text: `${guild.name} • Auto Role Setup`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [resultEmbed] });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /setup-roles:', error);

      if (interaction.deferred || interaction.replied) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
