/**
 * @file src/utils/musicManager.js
 * @description ตัวจัดการระบบสตรีมเสียงเพลง DisTube คุณภาพสูง และจัดการแผงควบคุมเพลงอัตโนมัติ
 */

const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { DirectLinkPlugin } = require('@distube/direct-link');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const config = require('../config/config');
const logger = require('./logger');

// เก็บรหัส Message ID ของแผงควบคุมเพลงหลักในช่องขอเพลง (guildId -> messageId)
const panelMessages = new Map();

/**
 * สร้าง Embed เครื่องเล่นเพลง (Music Player Embed)
 * @param {object} queue - DisTube Queue Object
 * @param {object} song - DisTube Song Object
 * @param {string} status - ข้อความสถานะ (กำลังเล่น / หยุดชั่วคราว)
 * @returns {EmbedBuilder} Embed Object
 */
function createMusicPlayerEmbed(queue, song, status = 'กำลังเล่น 🎶') {
  const isPaused = queue.paused;
  const loopMode = queue.repeatMode === 2 ? '🔂 วนซ้ำทั้งคิว' : (queue.repeatMode === 1 ? '🔂 วนซ้ำเพลงนี้' : '❌ ปิด');
  const volume = queue.volume || 100;
  const duration = song.formattedDuration || '00:00';
  const currentTime = queue.formattedCurrentTime || '00:00';

  // คำนวณเวลาที่เหลือและ Timestamp สำหรับนับถอยหลังสด
  const totalSec = song.duration || 1;
  const currentSec = queue.currentTime || 0;
  const remainingSec = Math.max(totalSec - currentSec, 0);
  const endTimestamp = Math.floor((Date.now() + remainingSec * 1000) / 1000);

  // Progress Bar
  const percent = Math.min(Math.max((currentSec / totalSec) * 100, 0), 100);
  const totalBars = 12;
  const progress = Math.round((percent / 100) * totalBars);
  const bar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(Math.max(totalBars - progress, 0));

  let timeDisplay = `⏱️ **ความยาว:** \`${duration}\` • จบในอีก <t:${endTimestamp}:R>`;
  if (isPaused) {
    timeDisplay = `⏱️ **หยุดอยู่ที่:** \`${currentTime} / ${duration}\` (⏸️ พักเพลง)`;
  } else if (song.isLive) {
    timeDisplay = `🔴 **สตรีมสด (Live Stream)**`;
  }

  return new EmbedBuilder()
    .setAuthor({
      name: `เครื่องเล่นเพลง Uryu Music Player • ${status}`,
      iconURL: 'https://cdn-icons-png.flaticon.com/512/3845/3845868.png'
    })
    .setTitle(song.name ? song.name.slice(0, 250) : 'ไม่ทราบชื่อเพลง')
    .setURL(song.url || 'https://discord.com')
    .setThumbnail(song.thumbnail || config.assets.securityIcon)
    .setColor(isPaused ? config.colors.warning : config.colors.primary)
    .setDescription(
      `👤 **ศิลปิน/ช่อง:** \`${song.uploader?.name || 'YouTube'}\`\n` +
      `${timeDisplay}\n` +
      `\`${bar}\`\n\n` +
      `🔊 **ระดับเสียง:** \`${volume}%\` | 🔁 **โหมดวนซ้ำ:** \`${loopMode}\`\n` +
      `📜 **เพลงในคิวรอเล่น:** \`${queue.songs.length - 1}\` เพลง\n` +
      `🙋 **ขอเพลงโดย:** ${song.user || 'สมาชิก'}`
    )
    .setFooter({
      text: `Source: ${song.source || 'YouTube'} • UryuBot High-Quality Audio`,
      iconURL: config.assets.securityIcon
    })
    .setTimestamp();
}

/**
 * สร้าง ActionRow ปุ่มควบคุมเครื่องเล่นเพลง
 * @param {object} queue - DisTube Queue Object
 * @returns {Array<ActionRowBuilder>} แถวปุ่มควบคุม
 */
function createMusicControls(queue) {
  const isPaused = queue ? queue.paused : false;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_previous')
      .setEmoji('⏮️')
      .setLabel('ก่อนหน้า')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_play_pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setLabel(isPaused ? 'เล่นต่อ' : 'พักเพลง')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setLabel('ข้าม')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setLabel('หยุด')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setEmoji('🔉')
      .setLabel('-10%')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setEmoji('🔊')
      .setLabel('+10%')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji('🔁')
      .setLabel('วนซ้ำ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setEmoji('📜')
      .setLabel('ดูคิวเพลง')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * สร้าง Embed หน้าตาสแตนด์บายเมื่อไม่มีเพลงเล่น (Standby Player Embed)
 * @param {object} guild - Discord Guild
 * @returns {EmbedBuilder}
 */
function createStandbyEmbed(guild) {
  return new EmbedBuilder()
    .setAuthor({
      name: `${guild.name} • Music Lounge`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle('🎵 ยังไม่มีเพลงที่กำลังเล่นอยู่ในขณะนี้')
    .setDescription(
      '💡 **วิธีขอเพลง:**\n' +
      '• พิมพ์ **ชื่อเพลง** หรือ **แปะลิงก์ YouTube / Spotify** ลงในช่องนี้ได้ทันที\n' +
      '• หรือพิมพ์คำสั่ง Slash Command `/play [ชื่อเพลง]`\n\n' +
      '*ระบบจะดึงเพลงเข้าคิวและเริ่มเล่นให้คุณโดยอัตโนมัติ 🎧*'
    )
    .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif')
    .setColor(config.colors.accent)
    .setFooter({
      text: 'Uryu Music System • 24/7 High Quality Audio',
      iconURL: config.assets.securityIcon
    });
}

/**
 * ตรวจสอบว่าช่องที่ระบุเป็นห้องขอเพลงประจำเซิร์ฟเวอร์หรือไม่ (ตรวจสอบเฉพาะ Channel ID ที่ตั้งค่าไว้เท่านั้น)
 * @param {object} channel - Discord GuildTextChannel
 * @returns {boolean}
 */
function isDedicatedMusicChannel(channel) {
  if (!channel || !config.bot.musicChannelId) return false;
  return channel.id === config.bot.musicChannelId;
}

/**
 * อัปเดตแผงควบคุมหลักในห้องขอเพลงประจำเซิร์ฟเวอร์ (แก้ไขข้อความเดิมอันเดียวเสมอ)
 * @param {object} guild - Discord Guild
 * @param {object|null} queue - DisTube Queue หรือ null
 * @param {object|null} song - DisTube Song หรือ null
 */
async function updateDedicatedMusicPanel(guild, queue = null, song = null) {
  try {
    if (!config.bot.musicChannelId) return;

    const musicChannel = guild.channels.cache.get(config.bot.musicChannelId);
    if (!musicChannel) return;

    let embed;
    let components = [];

    if (queue && song) {
      embed = createMusicPlayerEmbed(queue, song);
      components = createMusicControls(queue);
    } else {
      embed = createStandbyEmbed(guild);
    }

    // ค้นหาข้อความแผงควบคุมเดิม
    let panelMessageId = panelMessages.get(guild.id);
    let panelMessage = null;

    if (panelMessageId) {
      panelMessage = await musicChannel.messages.fetch(panelMessageId).catch(() => null);
    }

    if (!panelMessage) {
      // ค้นหาข้อความล่าสุดของบอทในช่อง
      const fetched = await musicChannel.messages.fetch({ limit: 15 }).catch(() => null);
      if (fetched && fetched.size > 0) {
        panelMessage = fetched.find(m => m.author.id === guild.members.me.id);
      }
    }

    if (panelMessage) {
      panelMessages.set(guild.id, panelMessage.id);
      await panelMessage.edit({ embeds: [embed], components: components }).catch(() => {});
    } else {
      // หากยังไม่มีแผงควบคุม ให้สร้างอันใหม่เพียงอันเดียว
      const newMsg = await musicChannel.send({ embeds: [embed], components: components });
      panelMessages.set(guild.id, newMsg.id);
    }
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดขณะอัปเดตแผงควบคุมเพลง:', error);
  }
}

/**
 * กำหนดค่าและสร้าง DisTube Instance ให้แก่ Discord Client
 * @param {object} client - Discord Client
 * @returns {DisTube} DisTube Instance
 */
function initDisTube(client) {
  const distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    ffmpeg: {
      path: require('ffmpeg-static')
    },
    plugins: [
      new SpotifyPlugin(),
      new SoundCloudPlugin(),
      new DirectLinkPlugin(),
      new YtDlpPlugin({ update: false })
    ]
  });

  // Event: เริ่มเล่นเพลง
  distube.on('playSong', (queue, song) => {
    logger.info(`กำลังเล่นเพลง: ${song.name} ในเซิร์ฟเวอร์ ${queue.textChannel?.guild?.name}`);
    if (queue.textChannel?.guild) {
      updateDedicatedMusicPanel(queue.textChannel.guild, queue, song);
    }

    // ส่งข้อความแจ้งเตือนเฉพาะเมื่อสั่งเล่นจากห้องอื่นที่ไม่ใช่ห้องขอเพลงหลัก
    if (queue.textChannel && !isDedicatedMusicChannel(queue.textChannel)) {
      const embed = createMusicPlayerEmbed(queue, song);
      const components = createMusicControls(queue);
      queue.textChannel.send({ embeds: [embed], components: components }).catch(() => {});
    }
  });

  // Event: เพิ่มเพลงเข้าคิว
  distube.on('addSong', (queue, song) => {
    // ในห้องขอเพลงจะอัปเดตบนแผงควบคุมหลักโดยตรง ไม่ส่งข้อความแยก
    if (queue.textChannel?.guild) {
      updateDedicatedMusicPanel(queue.textChannel.guild, queue, queue.songs[0]);
    }

    if (queue.textChannel && !isDedicatedMusicChannel(queue.textChannel)) {
      const addEmbed = new EmbedBuilder()
        .setTitle('➕ เพิ่มเพลงเข้าคิวเรียบร้อย')
        .setDescription(`🎵 **[${song.name}](${song.url})**\n⏱️ ความยาว: \`${song.formattedDuration}\` | 👤 ขอโดย: ${song.user}`)
        .setThumbnail(song.thumbnail)
        .setColor(config.colors.success)
        .setTimestamp();

      queue.textChannel.send({ embeds: [addEmbed] }).catch(() => {});
    }
  });

  // Event: เพิ่มเพลย์ลิสต์เข้าคิว
  distube.on('addList', (queue, playlist) => {
    if (queue.textChannel?.guild) {
      updateDedicatedMusicPanel(queue.textChannel.guild, queue, queue.songs[0]);
    }

    if (queue.textChannel && !isDedicatedMusicChannel(queue.textChannel)) {
      const listEmbed = new EmbedBuilder()
        .setTitle('📑 เพิ่มเพลย์ลิสต์เข้าคิวเรียบร้อย')
        .setDescription(`🎶 **[${playlist.name}](${playlist.url})**\n📊 รวมทั้งหมด: \`${playlist.songs.length}\` เพลง | 👤 ขอโดย: ${playlist.user}`)
        .setThumbnail(playlist.thumbnail)
        .setColor(config.colors.success)
        .setTimestamp();

      queue.textChannel.send({ embeds: [listEmbed] }).catch(() => {});
    }
  });

  // Event: เล่นเพลงในคิวหมดแล้ว
  distube.on('finish', (queue) => {
    if (queue.textChannel?.guild) {
      updateDedicatedMusicPanel(queue.textChannel.guild, null, null);
    }
  });

  // Event: ออกจากห้องเสียงเมื่อไม่มีคน
  distube.on('empty', (queue) => {
    if (queue.textChannel?.guild) {
      updateDedicatedMusicPanel(queue.textChannel.guild, null, null);
    }
  });

  // Event: เกิดข้อผิดพลาด
  distube.on('error', (error, queue, song) => {
    logger.error('เกิดข้อผิดพลาดในระบบ DisTube:', error?.message || error);
    const targetChannel = queue?.textChannel;
    if (targetChannel && targetChannel.send) {
      const errEmbed = new EmbedBuilder()
        .setTitle('❌ เกิดข้อผิดพลาดในการเล่นเพลง')
        .setDescription(`ไม่สามารถเล่นเพลงนี้ได้: \`${error?.message?.slice(0, 200) || 'Unknown error'}\``)
        .setColor(config.colors.danger);
      targetChannel.send({ embeds: [errEmbed] }).catch(() => {});
    }
  });

  client.distube = distube;
  logger.success('เริ่มต้นโมดูล DisTube Music System สำเร็จ');
  return distube;
}

/**
 * ทำความสะอาดข้อความตกค้างทั้งหมดในห้องขอเพลงเมื่อบอทเริ่มทำงาน และส่งแผงควบคุมเริ่มต้น
 * @param {object} client - Discord Client Instance
 */
async function cleanupMusicChannelOnStartup(client) {
  try {
    const channelId = config.bot.musicChannelId;
    if (!channelId) return;

    // ดึงช่องขอเพลงโดยตรงจาก Discord API
    const musicChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!musicChannel || !musicChannel.isTextBased()) return;

    const guild = musicChannel.guild;
    const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
    if (!botMember) return;

    const permissions = musicChannel.permissionsFor(botMember);
    if (!permissions || !permissions.has(PermissionFlagsBits.ManageMessages) || !permissions.has(PermissionFlagsBits.SendMessages)) {
      logger.warn(`บอทไม่มีสิทธิ์ ManageMessages หรือ SendMessages ในห้อง #${musicChannel.name}`);
      return;
    }

    // ดึงข้อความทั้งหมดในห้องขอเพลง (สูงสุด 100 ข้อความ)
    const messages = await musicChannel.messages.fetch({ limit: 100 }).catch(() => null);
    if (messages && messages.size > 0) {
      logger.info(`[Music Startup] กำลังทำความสะอาดข้อความ ${messages.size} ข้อความ ในห้อง #${musicChannel.name}...`);
      
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const youngMessages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(m => m.createdTimestamp <= twoWeeksAgo);

      if (youngMessages.size > 0) {
        await musicChannel.bulkDelete(youngMessages, true).catch(() => {});
      }

      for (const msg of oldMessages.values()) {
        await msg.delete().catch(() => {});
      }
    }

    // ส่งแผงควบคุม Standby อันใหม่ที่สะอาดเอี่ยม
    const standbyEmbed = createStandbyEmbed(guild);
    const panelMessage = await musicChannel.send({ embeds: [standbyEmbed] }).catch(() => null);
    if (panelMessage) {
      panelMessages.set(guild.id, panelMessage.id);
    }

    logger.success(`[Music Startup] ล้างข้อความตกค้างและรีเซ็ตแผงควบคุมใน #${musicChannel.name} (${guild.name}) สำเร็จ`);
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดขณะทำความสะอาดห้องขอเพลงตอนเริ่มต้น:', error);
  }
}

module.exports = {
  initDisTube,
  createMusicPlayerEmbed,
  createMusicControls,
  createStandbyEmbed,
  updateDedicatedMusicPanel,
  cleanupMusicChannelOnStartup,
  isDedicatedMusicChannel,
  panelMessages
};
