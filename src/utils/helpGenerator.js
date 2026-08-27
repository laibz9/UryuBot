/**
 * @file src/utils/helpGenerator.js
 * @description ยูทิลิตี้สร้าง Help Embed แบบ Rich Cards ที่อ่านง่าย โฟกัสชัดเจน และแยกตามสิทธิ์
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const config = require('../config/config');
const { isAdmin, isModerator } = require('./permissions');

/**
 * สร้าง Dropdown Select Menu สำหรับเลือกหมวดหมู่คำสั่งตามสิทธิ์
 * @param {object} member - GuildMember Object
 * @param {string} selected - หมวดหมู่ที่ถูกเลือกอยู่ในปัจจุบัน
 * @returns {Array<ActionRowBuilder>}
 */
function generateHelpComponents(member, selected = 'overview') {
  const isMod = isModerator(member);
  const isAdm = isAdmin(member);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('📂 เลือกหมวดหมู่คำสั่งที่ต้องการดู...')
    .setMinValues(1)
    .setMaxValues(1);

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('หน้าหลัก & ภาพรวม')
      .setValue('overview')
      .setDescription('ภาพรวมคำสั่งทั้งหมด')
      .setEmoji('🏠')
      .setDefault(selected === 'overview'),

    new StringSelectMenuOptionBuilder()
      .setLabel('ระบบดนตรี (Music)')
      .setValue('music')
      .setDescription('คำสั่งเล่นเพลง คิว ปรับเสียง (8 คำสั่ง)')
      .setEmoji('🎵')
      .setDefault(selected === 'music'),

    new StringSelectMenuOptionBuilder()
      .setLabel('ความบันเทิง (Fun)')
      .setValue('fun')
      .setDescription('เซียมซี มุกตลก กอด ทอยเต๋า (6 คำสั่ง)')
      .setEmoji('🎉')
      .setDefault(selected === 'fun'),

    new StringSelectMenuOptionBuilder()
      .setLabel('คำสั่งทั่วไป (General)')
      .setValue('general')
      .setDescription('สร้างโพล เช็คปิง (3 คำสั่ง)')
      .setEmoji('💬')
      .setDefault(selected === 'general')
  ];

  // แสดงหมวด Moderation ให้เฉพาะ Moderator และ Admin
  if (isMod || isAdm) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('ดูแลความสงบ (Moderation)')
        .setValue('moderation')
        .setDescription('เตะ แบน ปิดแชท ล็อกดาวน์ (9 คำสั่ง)')
        .setEmoji('⚔️')
        .setDefault(selected === 'moderation')
    );
  }

  // แสดงหมวด Admin ให้เฉพาะ Admin / Leader
  if (isAdm) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('ตั้งค่าระบบ (Admin Setup)')
        .setValue('admin')
        .setDescription('ติดตั้งยศ ต้อนรับ ทิกเก็ต ขอเพลง (7 คำสั่ง)')
        .setEmoji('👑')
        .setDefault(selected === 'admin')
    );
  }

  selectMenu.addOptions(options);

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

/**
 * สร้าง Embed แสดงรายละเอียดคำสั่งในหมวดหมู่ที่เลือก (จัดหมวดชัดเจน อ่านง่ายใน 3 วินาที)
 * @param {string} category - ชื่อหมวดหมู่ ('overview', 'music', 'fun', 'general', 'moderation', 'admin')
 * @param {object} member - GuildMember Object
 * @param {object} client - Discord Client Instance
 * @returns {EmbedBuilder}
 */
function generateHelpEmbed(category, member, client) {
  const guild = member.guild;
  const isMod = isModerator(member);
  const isAdm = isAdmin(member);

  const embed = new EmbedBuilder()
    .setFooter({
      text: `UryuBot • สิทธิ์ของคุณ: ${isAdm ? '👑 Admin / Leader' : (isMod ? '⚔️ Moderator' : '✅ Member')}`,
      iconURL: member.user.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();

  const bannerUrl = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXBybHprZnVrbnkxdHl1NHAyaGszNWh0eWRsM2xsNm1ub2QxMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif';

  switch (category) {
    case 'overview': {
      embed
        .setColor(config.colors.accent)
        .setAuthor({
          name: `${guild.name} • คู่มือคำสั่งบอท`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle('🤖 ศูนย์รวมคำสั่ง UryuBot')
        .setDescription(
          `สวัสดีครับ **${member.displayName}** 👋\n` +
          `👇 **เลือกดูรายละเอียดคำสั่งแต่ละหมวดหมู่ได้จาก Dropdown ด้านล่าง**`
        )
        .addFields(
          {
            name: '🎵 ระบบดนตรี (8 คำสั่ง)',
            value: '• สตรีมเพลง YouTube / Spotify พร้อมแผงควบคุมสด',
            inline: true
          },
          {
            name: '🎉 ความบันเทิง (6 คำสั่ง)',
            value: '• เซียมซีดูดวง, มุกตลก, ทอยเต๋า, เสี่ยงเหรียญ',
            inline: true
          },
          {
            name: '💬 คำสั่งทั่วไป (3 คำสั่ง)',
            value: '• สร้างโพลสำรวจสด, เช็คความเร็วบอท',
            inline: true
          }
        )
        .setImage(bannerUrl);

      if (isMod || isAdm) {
        embed.addFields({
          name: '⚔️ ดูแลความสงบ (9 คำสั่ง)',
          value: '• ล็อกดาวน์ฉุกเฉิน, เตะ, แบน, ปิดแชท, ลบข้อความ',
          inline: true
        });
      }

      if (isAdm) {
        embed.addFields({
          name: '👑 ตั้งค่าระบบ (7 คำสั่ง)',
          value: '• ติดตั้งยศ, ต้อนรับ, บันทึก Log, ทิกเก็ต, ขอเพลง',
          inline: true
        });
      }
      break;
    }

    case 'music':
      embed
        .setColor(config.colors.primary)
        .setAuthor({
          name: '🎵 หมวดระบบดนตรี & เพลง (Music Lounge)',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/3845/3845868.png'
        })
        .addFields(
          {
            name: '▶️ เล่น & ควบคุมเพลง',
            value: 
              '`/play [เพลง]` — ค้นหาและเริ่มเล่นเพลง\n' +
              '`/skip` — ข้ามเพลง | `/stop` — หยุดและล้างคิว\n' +
              '`/pause` — พักเพลง | `/resume` — เล่นต่อ',
            inline: false
          },
          {
            name: '🎛️ คิว & ปรับระดับเสียง',
            value: 
              '`/queue` — ดูรายการเพลงในคิว\n' +
              '`/volume [1-100]` — ปรับความดังเสียง\n' +
              '`/loop [โหมด]` — สลับโหมดวนซ้ำ (ปิด/เพลงนี้/ทั้งคิว)',
            inline: false
          },
          {
            name: '💡 ขอเพลงด่วน',
            value: 'พิมพ์ชื่อเพลงหรือแปะลิงก์ในห้อง `#ขอเพลง-music` ได้ทันที',
            inline: false
          }
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif');
      break;

    case 'fun':
      embed
        .setColor(config.colors.warning)
        .setAuthor({
          name: '🎉 หมวดความบันเทิง & มินิเกม (Fun Suite)',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/3163/3163508.png'
        })
        .addFields(
          {
            name: '🔮 ดูดวง & เสี่ยงทาย',
            value: 
              '`/fortune` — เสี่ยงเซียมซีทำนายดวงประจำวัน (เลขเด็ด/สีมงคล)\n' +
              '`/8ball [คำถาม]` — ถามลูกแก้ววิเศษทำนายคำตอบ\n' +
              '`/coinflip` — สุ่มโยนเหรียญ หัว หรือ ก้อย\n' +
              '`/dice [หน้า]` — ทอยลูกเต๋าสุ่มแต้ม (1-6 หรือระบุหน้า)',
            inline: false
          },
          {
            name: '💖 สังคม & คลายเครียด',
            value: 
              '`/hug [@user]` — ส่งอ้อมกอดอุ่นๆ มอบกำลังใจให้เพื่อน\n' +
              '`/joke [หมวด]` — สุ่มมุกตลกฮาๆ หรือมุกเสี่ยว',
            inline: false
          }
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXoxeGt0OGoxOHJhZDNqZXdndW5zMnUxbmd1dWRuNDlnNnpudXdpOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g9582DNuQppxC/giphy.gif');
      break;

    case 'general':
      embed
        .setColor(config.colors.info)
        .setAuthor({
          name: '💬 หมวดคำสั่งทั่วไป (General & Polls)',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png'
        })
        .addFields(
          {
            name: '📊 กิจกรรม & สำรวจความคิดเห็น',
            value: '`/poll [คำถาม] [ตัวเลือก]` — สร้างโพลสำรวจสดพร้อมปุ่มกดโหวต',
            inline: false
          },
          {
            name: '⚡ ข้อมูลบอท & ระบบ',
            value: 
              '`/ping` — ตรวจสอบความเร็วการตอบสนองของบอท\n' +
              '`/help` — เปิดเมนูสารบัญคำสั่งและคู่มือระบบ',
            inline: false
          }
        )
        .setImage(bannerUrl);
      break;

    case 'moderation':
      if (!isMod && !isAdm) {
        embed
          .setColor(config.colors.danger)
          .setTitle('⛔ สิทธิ์ไม่เพียงพอ')
          .setDescription('หมวดหมู่นี้สงวนไว้สำหรับ **Moderator** และ **Administrator** เท่านั้น');
        break;
      }

      embed
        .setColor(config.colors.danger)
        .setAuthor({
          name: '⚔️ หมวดระบบดูแลความสงบ (Moderation Suite)',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/942/942748.png'
        })
        .addFields(
          {
            name: '🚨 ความปลอดภัยฉุกเฉิน',
            value: '`/lockdown [on/off]` — ปิดสิทธิ์การพิมพ์ชั่วคราว (ทั้งเซิร์ฟ/เฉพาะห้อง)',
            inline: false
          },
          {
            name: '🔨 จัดการสมาชิก & บทลงโทษ',
            value: 
              '`/kick [@user]` — เตะสมาชิกออกจากเซิร์ฟเวอร์\n' +
              '`/ban [@user]` | `/unban [id]` — แบน / ปลดแบนสมาชิก\n' +
              '`/timeout [@user]` | `/untimeout` — ปิดแชทชั่วคราว / ยกเลิก',
            inline: false
          },
          {
            name: '🧹 จัดการข้อความ & สถิติ',
            value: 
              '`/clear [จำนวน]` — ลบข้อความจำนวนมาก (1-100)\n' +
              '`/userinfo [@user]` — ตรวจสอบข้อมูลโปรไฟล์และยศ\n' +
              '`/serverinfo` — ตรวจสอบสถิติและข้อมูลเซิร์ฟเวอร์',
            inline: false
          }
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1aGNtc2w0OGpsbTV2bHhpZWdrMWtyZnoxMmswbHF6MjdlaHliYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4b45b8KXYCitkY/giphy.gif');
      break;

    case 'admin':
      if (!isAdm) {
        embed
          .setColor(config.colors.danger)
          .setTitle('⛔ สิทธิ์ไม่เพียงพอ')
          .setDescription('หมวดหมู่นี้สงวนไว้สำหรับ **Administrator / Server Owner** เท่านั้น');
        break;
      }

      embed
        .setColor(config.colors.warning)
        .setAuthor({
          name: '👑 หมวดตั้งค่าระบบ & แอดมิน (Admin & Setup Panel)',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/2942/2942813.png'
        })
        .addFields(
          {
            name: '⚙️ ตั้งค่าโครงสร้างเซิร์ฟเวอร์',
            value: 
              '`/setup-roles` — สร้างยศ Leader, Admin, Mod, Verified อัตโนมัติ\n' +
              '`/setup-welcome` — ตั้งค่าช่องต้อนรับและบอกลาสมาชิก\n' +
              '`/setup-logs` — ตั้งค่าช่องบันทึกประวัติความปลอดภัย Audit Logs\n' +
              '`/setup-music` — ติดตั้งห้องขอเพลงพร้อมแผงควบคุมถาวร',
            inline: false
          },
          {
            name: '📨 ส่งแผงควบคุม & ประกาศ',
            value: 
              '`/send-verify` — ส่งแผงยืนยันตัวตน CAPTCHA Modal\n' +
              '`/send-ticket` — ส่งแผงเปิดตั๋ว Support Ticket\n' +
              '`/announce` — ส่งประกาศข่าวสารทางการแบบ Embed',
            inline: false
          }
        )
        .setImage(bannerUrl);
      break;

    default:
      embed.setTitle('ไม่พบหมวดหมู่ที่เลือก');
  }

  return embed;
}

module.exports = {
  generateHelpComponents,
  generateHelpEmbed
};
