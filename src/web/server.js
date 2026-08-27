/**
 * @file src/web/server.js
 * @description Express Web Server, Discord OAuth2 Login และ REST API (Server Owner Security Guard)
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getGuildSettings, updateGuildSettings } = require('../database/db');
const { createVerificationEmbed, createTicketPanelEmbed } = require('../utils/embeds');
const { cleanupMusicChannelOnStartup } = require('../utils/musicManager');

/**
 * เริ่มต้น Web Server และเชื่อมต่อกับ Discord Client
 * @param {object} client - Instance ของ Discord Client
 * @returns {object} Express App Instance
 */
function startWebServer(client) {
  const app = express();
  const port = config.bot.webPort || 3000;

  // ตั้งค่า Cookie Parser ด้วย Secret Key
  app.use(cookieParser(config.bot.sessionSecret));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  /**
   * Helper: ดึงข้อมูล User จาก Signed Cookie
   */
  function getSessionUser(req) {
    const cookie = req.signedCookies.uryu_user;
    if (!cookie) return null;
    try {
      return JSON.parse(cookie);
    } catch {
      return null;
    }
  }

  /**
   * Middleware: ตรวจสอบสิทธิ์เฉพาะเจ้าของเซิร์ฟเวอร์ (Server Owner Only Guard)
   */
  function requireServerOwner(req, res, next) {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '🔒 กรุณาเข้าสู่ระบบด้วยบัญชี Discord ก่อนทำการตั้งค่า'
      });
    }

    const guildId = req.params.guildId || req.body.guildId;
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'ต้องระบุ Guild ID' });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์ในระบบบอท' });
    }

    // ตรวจสอบอย่างเข้มงวด: ผู้ใช้ต้องเป็นเจ้าของเซิร์ฟเวอร์ (Server Owner)
    if (guild.ownerId !== user.id) {
      logger.warn(`[Security Guard] บัญชี ${user.username} (${user.id}) พยายามเข้าถึงเซิร์ฟเวอร์ "${guild.name}" โดยไม่ใช่เจ้าของ`);
      return res.status(403).json({
        success: false,
        error: `⛔ สิทธิ์ไม่เพียงพอ: บัญชีของคุณ (${user.username}) ไม่ใช่เจ้าของเซิร์ฟเวอร์ "${guild.name}"`
      });
    }

    req.user = user;
    next();
  }

  // ========================================================
  // 🔑 Discord OAuth2 Authentication Endpoints
  // ========================================================

  /**
   * GET /api/auth/login: ส่งผู้ใช้ไปหน้ายืนยันสิทธิ์ของ Discord
   */
  app.get('/api/auth/login', (req, res) => {
    if (!config.bot.clientId) {
      return res.status(500).send('ยังไม่ได้ตั้งค่า CLIENT_ID ใน .env');
    }

    const redirectUri = encodeURIComponent(config.bot.redirectUri);
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${config.bot.clientId}&response_type=code&redirect_uri=${redirectUri}&scope=identify%20guilds`;

    res.redirect(discordAuthUrl);
  });

  /**
   * GET /api/auth/callback: รับ Auth Code แลก Access Token และเก็บ User Profile
   */
  app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/?error=no_code');
    }

    try {
      if (!config.bot.clientSecret) {
        logger.error('ไม่พบ CLIENT_SECRET ในไฟล์ .env');
        return res.status(500).send('กรุณาระบุ CLIENT_SECRET ใน .env เพื่อใช้งานระบบล็อกอิน');
      }

      // 1. แลกเปลี่ยน Code เป็น Access Token
      const clientId = String(config.bot.clientId || '').trim().replace(/^["']|["']$/g, '');
      const clientSecret = String(config.bot.clientSecret || '').trim().replace(/^["']|["']$/g, '');
      const redirectUri = String(config.bot.redirectUri || '').trim().replace(/^["']|["']$/g, '');

      if (!clientSecret) {
        logger.error('[OAuth2] ไม่พบ CLIENT_SECRET ในไฟล์ .env หรือค่ายังคงว่างอยู่');
        return res.redirect('/?error=missing_client_secret');
      }

      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', clientId);
      tokenParams.append('client_secret', clientSecret);
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('code', code);
      tokenParams.append('redirect_uri', redirectUri);

      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errData = await tokenResponse.text();
        logger.error('OAuth2 Token Exchange Error:', errData);
        logger.warn(`[OAuth2 Debug] ตรวจสอบค่า:`);
        logger.warn(`- Client ID: "${clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : 'ว่างเปล่า'}" (ความยาว: ${clientId.length})`);
        logger.warn(`- Client Secret: "${clientSecret ? `${clientSecret.slice(0, 4)}...${clientSecret.slice(-4)}` : 'ว่างเปล่า'}" (ความยาว: ${clientSecret.length})`);
        logger.warn(`- Redirect URI: "${redirectUri}"`);
        return res.redirect('/?error=token_failed');
      }

      const tokenData = await tokenResponse.json();

      // 2. ดึงข้อมูล Profile ของผู้ใช้ (@me)
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userResponse.ok) {
        return res.redirect('/?error=user_fetch_failed');
      }

      const userData = await userResponse.json();

      // 3. จัดเก็บข้อมูลลง Signed Cookie
      const sessionUser = {
        id: userData.id,
        username: userData.username,
        global_name: userData.global_name || userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
          : 'https://cdn-icons-png.flaticon.com/512/1069/1069210.png'
      };

      res.cookie('uryu_user', JSON.stringify(sessionUser), {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
        signed: true,
        sameSite: 'lax'
      });

      logger.success(`[OAuth2] ผู้ใช้ ${sessionUser.username} (${sessionUser.id}) เข้าสู่ระบบสำเร็จ`);
      res.redirect('/#dashboard');
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน OAuth2 Callback:', error);
      res.redirect('/?error=auth_internal_error');
    }
  });

  /**
   * GET /api/auth/user: ตรวจสอบสถานะการล็อกอินของผู้ใช้ปัจจุบัน
   */
  app.get('/api/auth/user', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.json({ loggedIn: false, user: null });
    }

    // ตรวจสอบว่าผู้ใช้นี้เป็นเจ้าของเซิร์ฟเวอร์ใดบ้างที่บอทประจำการอยู่
    const ownedGuilds = client.guilds.cache.filter(g => g.ownerId === user.id).map(g => ({
      id: g.id,
      name: g.name
    }));

    res.json({
      loggedIn: true,
      user,
      ownedGuildsCount: ownedGuilds.length,
      isOwnerOfAny: ownedGuilds.length > 0,
      ownedGuilds
    });
  });

  /**
   * GET /api/auth/logout: ออกจากระบบ
   */
  app.get('/api/auth/logout', (req, res) => {
    res.clearCookie('uryu_user');
    res.redirect('/');
  });

  // ========================================================
  // 📊 Public Stats & Commands APIs (ทุกคนดูได้)
  // ========================================================

  /**
   * API: ดึงข้อมูลสถิติสดของบอทและสถานะเพลง (Live Stats)
   */
  app.get('/api/stats', (req, res) => {
    try {
      const guildCount = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
      const ping = client.ws.ping >= 0 ? client.ws.ping : 0;
      const uptimeSec = Math.floor(process.uptime());

      const days = Math.floor(uptimeSec / (3600 * 24));
      const hours = Math.floor((uptimeSec % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;
      const uptimeFormatted = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;

      let musicData = {
        isPlaying: false,
        songName: 'ยังไม่มีเพลงที่กำลังเล่น',
        artist: 'Uryu Music Lounge',
        thumbnail: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif',
        duration: '00:00',
        currentTime: '00:00',
        progressPercent: 0,
        isPaused: false,
        guildName: '-'
      };

      if (client.distube) {
        const queues = client.distube.queues?.collection;
        if (queues && queues.size > 0) {
          const activeQueue = queues.first();
          if (activeQueue && activeQueue.songs && activeQueue.songs.length > 0) {
            const currentSong = activeQueue.songs[0];
            const totalSec = currentSong.duration || 1;
            const currentSec = activeQueue.currentTime || 0;
            const percent = Math.min(Math.max((currentSec / totalSec) * 100, 0), 100);

            musicData = {
              isPlaying: true,
              songName: currentSong.name || 'ไม่ทราบชื่อเพลง',
              artist: currentSong.uploader?.name || currentSong.source || 'YouTube',
              thumbnail: currentSong.thumbnail || config.assets.securityIcon,
              duration: currentSong.formattedDuration || '00:00',
              currentTime: activeQueue.formattedCurrentTime || '00:00',
              progressPercent: Math.round(percent),
              isPaused: activeQueue.paused || false,
              guildName: activeQueue.textChannel?.guild?.name || 'Discord Server',
              queueCount: activeQueue.songs.length
            };
          }
        }
      }

      const botData = {
        name: client.user?.username || 'UryuBot',
        tag: client.user?.tag || 'UryuBot#0000',
        avatar: client.user?.displayAvatarURL({ dynamic: true, size: 256 }) || config.assets.securityIcon,
        status: 'online',
        clientId: config.bot.clientId,
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${config.bot.clientId}&permissions=8&scope=bot%20applications.commands`
      };

      res.json({
        success: true,
        bot: botData,
        stats: {
          guildCount,
          totalMembers,
          ping,
          uptimeSec,
          uptimeFormatted,
          totalCommands: client.commands.size || 33
        },
        music: musicData
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน API /api/stats:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  // ========================================================
  // 🔒 Protected Server Owner APIs (เฉพาะ Server Owner)
  // ========================================================

  /**
   * API: ดึงรายชื่อเซิร์ฟเวอร์ที่ User เป็นเจ้าของ (Server Owner Only)
   */
  app.get('/api/guilds', (req, res) => {
    try {
      const user = getSessionUser(req);
      if (!user) {
        return res.json({ success: true, loggedIn: false, guilds: [] });
      }

      // กรองเฉพาะเซิร์ฟเวอร์ที่ผู้ใช้เป็น Server Owner (guild.ownerId === user.id)
      const ownedGuilds = client.guilds.cache.filter(guild => guild.ownerId === user.id);

      const guilds = ownedGuilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ dynamic: true }) || 'https://cdn-icons-png.flaticon.com/512/1069/1069210.png',
        memberCount: guild.memberCount,
        channels: guild.channels.cache
          .filter(c => c.isTextBased() || c.type === 4)
          .map(c => ({ id: c.id, name: c.name, type: c.type }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        roles: guild.roles.cache
          .filter(r => r.name !== '@everyone')
          .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
          .sort((a, b) => b.name.localeCompare(a.name))
      }));

      res.json({ success: true, loggedIn: true, guilds });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดใน API /api/guilds:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ดึงการตั้งค่าของเซิร์ฟเวอร์ (Protected)
   */
  app.get('/api/settings/:guildId', requireServerOwner, (req, res) => {
    try {
      const { guildId } = req.params;
      const settings = getGuildSettings(guildId);
      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: บันทึกการตั้งค่าเซิร์ฟเวอร์ (Protected)
   */
  app.post('/api/settings/:guildId', requireServerOwner, async (req, res) => {
    try {
      const { guildId } = req.params;
      const updated = await updateGuildSettings(guildId, req.body);
      res.json({ success: true, message: 'บันทึกการตั้งค่าลงฐานข้อมูลสำเร็จ', settings: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ส่งแผงยืนยันตัวตน (Protected)
   */
  app.post('/api/actions/send-verify', requireServerOwner, async (req, res) => {
    try {
      const { guildId, channelId } = req.body;
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'ช่องแชทไม่ถูกต้อง' });

      const embed = createVerificationEmbed(guild);
      const verifyButton = new ButtonBuilder()
        .setCustomId('btn_verify')
        .setLabel('🔐 ยืนยันตัวตน (Verify Account)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️');

      const row = new ActionRowBuilder().addComponents(verifyButton);
      await channel.send({ embeds: [embed], components: [row] });

      logger.success(`[Web Action] เจ้าของเซิร์ฟเวอร์ (${req.user.username}) ส่งแผงยืนยันตัวตนเข้า #${channel.name}`);
      res.json({ success: true, message: `ส่งแผงยืนยันตัวตนเข้าช่อง #${channel.name} เรียบร้อยแล้ว` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ส่งแผงเปิดทิกเก็ต (Protected)
   */
  app.post('/api/actions/send-ticket', requireServerOwner, async (req, res) => {
    try {
      const { guildId, channelId } = req.body;
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'ช่องแชทไม่ถูกต้อง' });

      const embed = createTicketPanelEmbed(guild);
      const ticketButton = new ButtonBuilder()
        .setCustomId('btn_ticket_open')
        .setLabel('🎫 เปิดทิกเก็ตขอความช่วยเหลือ (Create Ticket)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📩');

      const row = new ActionRowBuilder().addComponents(ticketButton);
      await channel.send({ embeds: [embed], components: [row] });

      logger.success(`[Web Action] เจ้าของเซิร์ฟเวอร์ (${req.user.username}) ส่งแผงทิกเก็ตเข้า #${channel.name}`);
      res.json({ success: true, message: `ส่งแผงทิกเก็ตเข้าช่อง #${channel.name} เรียบร้อยแล้ว` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ติดตั้งห้องขอเพลง (Protected)
   */
  app.post('/api/actions/setup-music', requireServerOwner, async (req, res) => {
    try {
      const { guildId, channelId } = req.body;
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'ช่องแชทไม่ถูกต้อง' });

      await updateGuildSettings(guildId, { musicChannelId: channelId });
      await cleanupMusicChannelOnStartup(client);

      logger.success(`[Web Action] เจ้าของเซิร์ฟเวอร์ (${req.user.username}) ติดตั้งห้องขอเพลงใน #${channel.name}`);
      res.json({ success: true, message: `ติดตั้งห้องขอเพลงประจำเซิร์ฟเวอร์ใน #${channel.name} สำเร็จ` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ส่งประกาศข่าวสาร (Protected)
   */
  app.post('/api/actions/announce', requireServerOwner, async (req, res) => {
    try {
      const { guildId, channelId, title, description, color, image } = req.body;
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'ช่องแชทไม่ถูกต้อง' });

      const embed = new EmbedBuilder()
        .setTitle(title || '📢 ประกาศจากเจ้าของเซิร์ฟเวอร์')
        .setDescription(description || 'ไม่มีเนื้อหา')
        .setColor(color || config.colors.accent)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setFooter({ text: `ประกาศโดย Server Owner (${req.user.username})`, iconURL: req.user.avatar })
        .setTimestamp();

      if (image && image.startsWith('http')) {
        embed.setImage(image);
      }

      await channel.send({ embeds: [embed] });
      logger.success(`[Web Action] เจ้าของเซิร์ฟเวอร์ (${req.user.username}) ส่งประกาศเข้า #${channel.name}`);
      res.json({ success: true, message: `ส่งประกาศข่าวสารเข้า #${channel.name} สำเร็จแล้ว` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ล็อกดาวน์ฉุกเฉิน (Protected)
   */
  app.post('/api/actions/lockdown', requireServerOwner, async (req, res) => {
    try {
      const { guildId, channelId, enable } = req.body;
      const guild = client.guilds.cache.get(guildId);
      const everyoneRole = guild.roles.everyone;
      const lockState = enable === true;

      if (channelId && channelId !== 'all') {
        const channel = guild.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
          await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: !lockState });
        }
      } else {
        const textChannels = guild.channels.cache.filter(c => c.isTextBased());
        for (const ch of textChannels.values()) {
          await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: !lockState }).catch(() => {});
        }
      }

      logger.success(`[Web Action] เจ้าของเซิร์ฟเวอร์ (${req.user.username}) ปรับสถานะ Lockdown เป็น ${lockState}`);
      res.json({ success: true, message: `ดำเนินการ${lockState ? '🚨 ล็อกดาวน์ฉุกเฉิน' : '🔓 ปลดล็อกดาวน์'} เรียบร้อยแล้ว` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ดึงรายชื่อคำสั่งทั้งหมด
   */
  app.get('/api/commands', (req, res) => {
    try {
      const commandsList = [
        { name: '/play', category: 'music', desc: 'ค้นหาและเริ่มเล่นเพลงจาก YouTube, Spotify, SoundCloud', perm: 'Everyone' },
        { name: '/skip', category: 'music', desc: 'ข้ามไปยังเพลงถัดไปในคิว', perm: 'Everyone' },
        { name: '/pause', category: 'music', desc: 'พักการเล่นเพลงชั่วคราว', perm: 'Everyone' },
        { name: '/resume', category: 'music', desc: 'เล่นเพลงต่อจากที่หยุดไว้', perm: 'Everyone' },
        { name: '/stop', category: 'music', desc: 'หยุดเล่น ล้างคิว และออกจากห้องเสียง', perm: 'Everyone' },
        { name: '/queue', category: 'music', desc: 'ดูรายการคิวเพลงที่กำลังรอเล่น', perm: 'Everyone' },
        { name: '/volume', category: 'music', desc: 'ปรับระดับความดังเสียง (1 - 100%)', perm: 'Everyone' },
        { name: '/loop', category: 'music', desc: 'ตั้งค่าโหมดเล่นวนซ้ำ (ปิด/เพลงนี้/ทั้งคิว)', perm: 'Everyone' },

        { name: '/fortune', category: 'fun', desc: 'เขย่าเซียมซีทำนายดวงประจำวัน พร้อมเลขเด็ดและสีมงคล', perm: 'Everyone' },
        { name: '/hug', category: 'fun', desc: 'ส่งอ้อมกอดอุ่นๆ มอบกำลังใจให้เพื่อนพร้อมภาพ GIF น่ารัก', perm: 'Everyone' },
        { name: '/joke', category: 'fun', desc: 'สุ่มเล่ามุกตลกฮาๆ หรือมุกเสี่ยวเกี้ยวสาว', perm: 'Everyone' },
        { name: '/8ball', category: 'fun', desc: 'ถามลูกแก้ววิเศษ 8-Ball ทำนายคำตอบ', perm: 'Everyone' },
        { name: '/coinflip', category: 'fun', desc: 'สุ่มเสี่ยงทายโยนเหรียญ หัว หรือ ก้อย', perm: 'Everyone' },
        { name: '/dice', category: 'fun', desc: 'ทอยลูกเต๋าสุ่มแต้ม (1-6 หรือกำหนดจำนวนหน้า)', perm: 'Everyone' },

        { name: '/help', category: 'general', desc: 'เปิดดูคู่มือคำสั่งและสารบัญระบบแบบ Dropdown', perm: 'Everyone' },
        { name: '/poll', category: 'general', desc: 'สร้างโพลสำรวจความคิดเห็นสดพร้อมปุ่มกดโหวตและ Progress Bar', perm: 'Everyone' },
        { name: '/ping', category: 'general', desc: 'ตรวจสอบความเร็ว Latency และ WebSocket Ping ของบอท', perm: 'Everyone' },

        { name: '/lockdown', category: 'moderation', desc: '🚨 ล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (เปิด/ปิด ทั้งเซิร์ฟหรือเฉพาะช่อง)', perm: 'Manage Channels' },
        { name: '/kick', category: 'moderation', desc: 'เตะสมาชิกออกจากเซิร์ฟเวอร์', perm: 'Kick Members' },
        { name: '/ban', category: 'moderation', desc: 'แบนสมาชิกออกจากเซิร์ฟเวอร์ถาวร', perm: 'Ban Members' },
        { name: '/unban', category: 'moderation', desc: 'ปลดแบนผู้ใช้งานด้วย User ID', perm: 'Ban Members' },
        { name: '/timeout', category: 'moderation', desc: 'ปิดการใช้งานแชทชั่วคราว (1 นาที - 1 สัปดาห์)', perm: 'Moderate Members' },
        { name: '/untimeout', category: 'moderation', desc: 'ยกเลิกการปิดแชทชั่วคราว', perm: 'Moderate Members' },
        { name: '/clear', category: 'moderation', desc: 'ลบข้อความในช่องแชทจำนวนมาก (1 - 100 ข้อความ)', perm: 'Manage Messages' },
        { name: '/userinfo', category: 'moderation', desc: 'ตรวจสอบประวัติ วันสมัครบัญชี และยศของสมาชิก', perm: 'Everyone' },
        { name: '/serverinfo', category: 'moderation', desc: 'ตรวจสอบสถิติ วันสร้าง และข้อมูลของเซิร์ฟเวอร์', perm: 'Everyone' },

        { name: '/setup-roles', category: 'admin', desc: '👑 สร้างยศ Leader, Admin, Mod, Verified อัตโนมัติ', perm: 'Leader / Owner' },
        { name: '/setup-welcome', category: 'admin', desc: '👋 ตั้งค่าช่องต้อนรับสมาชิกใหม่และบอกลา', perm: 'Administrator' },
        { name: '/setup-logs', category: 'admin', desc: '🛡️ ตั้งค่าช่องบันทึกประวัติความปลอดภัย Audit Logs', perm: 'Administrator' },
        { name: '/setup-music', category: 'admin', desc: '🎵 ติดตั้งห้องขอเพลงเฉพาะพร้อมแผงควบคุมถาวร', perm: 'Administrator' },
        { name: '/send-verify', category: 'admin', desc: '🔐 ส่งแผงยืนยันตัวตน CAPTCHA Modal สุ่มรหัส 6 หลัก', perm: 'Administrator' },
        { name: '/send-ticket', category: 'admin', desc: '🎫 ส่งแผงเปิดตั๋ว Support Ticket พร้อมระบบ HTML Transcript', perm: 'Administrator' },
        { name: '/announce', category: 'admin', desc: '📢 ส่งประกาศข่าวสารทางการแบบ Embed ดีไซน์พรีเมียม', perm: 'Manage Messages' }
      ];

      res.json({ success: true, count: commandsList.length, commands: commandsList });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  // ส่งไฟล์ index.html สำหรับทุกเส้นทางที่เหลือ (SPA Routing)
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // เริ่มต้นรับการเชื่อมต่อ
  app.listen(port, () => {
    logger.success(`==============================================`);
    logger.success(`🌐 Web Portal & Secure Dashboard ออนไลน์แล้วที่:`);
    logger.success(`👉 http://localhost:${port}`);
    logger.success(`==============================================`);
  });

  return app;
}

module.exports = { startWebServer };
