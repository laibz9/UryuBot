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
  app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
  app.use(express.json());

  /**
   * Helper: ดึงข้อมูล User จาก Signed Cookie (รองรับทั้ง Object, String, Unsigned, และ Fallback)
   */
  function getSessionUser(req) {
    let cookie = req.signedCookies?.uryu_user;
    if (!cookie) {
      cookie = req.cookies?.uryu_user;
    }
    if (!cookie) return null;
    if (typeof cookie === 'object') return cookie;
    if (typeof cookie === 'string') {
      if (cookie.startsWith('s:')) {
        const unsigned = cookie.slice(2);
        const dotIndex = unsigned.lastIndexOf('.');
        const rawContent = dotIndex !== -1 ? unsigned.slice(0, dotIndex) : unsigned;
        const jsonStr = rawContent.startsWith('j:') ? rawContent.slice(2) : rawContent;
        try {
          return JSON.parse(decodeURIComponent(jsonStr));
        } catch {}
      }
      try {
        return JSON.parse(cookie);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Middleware: ตรวจสอบสิทธิ์เฉพาะเจ้าของหรือแอดมินเซิร์ฟเวอร์ (Server Owner & Admin Guard)
   */
  async function requireServerOwner(req, res, next) {
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

    // ตรวจสอบว่าเป็น Server Owner หรือมีสิทธิ์แอดมิน
    let isAuthorized = (guild.ownerId === user.id);
    if (!isAuthorized) {
      try {
        const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
        if (member && (
          member.permissions.has(PermissionFlagsBits.Administrator) ||
          member.permissions.has(PermissionFlagsBits.ManageGuild) ||
          member.permissions.has(PermissionFlagsBits.ManageRoles)
        )) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      logger.warn(`[Security Guard] บัญชี ${user.username} (${user.id}) พยายามเข้าถึงเซิร์ฟเวอร์ "${guild.name}" โดยไม่มีสิทธิ์`);
      return res.status(403).json({
        success: false,
        error: `⛔ สิทธิ์ไม่เพียงพอ: บัญชีของคุณ (${user.username}) ไม่ใช่เจ้าของหรือผู้ดูแลเซิร์ฟเวอร์ "${guild.name}"`
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
   * GET /api/auth/callback: รับ Authorization Code แลก Token และสร้าง Session Cookie
   */
  app.get('/api/auth/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
      logger.warn(`OAuth2 Callback ถูกยกเลิกหรือล้มเหลว: ${error || 'No Code'}`);
      return res.redirect('/?error=access_denied');
    }

    try {
      const clientId = config.bot.clientId?.trim();
      const clientSecret = config.bot.clientSecret?.trim();
      const redirectUri = config.bot.redirectUri?.trim();

      if (!clientSecret) {
        logger.error('ไม่พบ CLIENT_SECRET ในไฟล์ .env');
        return res.redirect('/?error=missing_client_secret');
      }

      // 1. แลกเปลี่ยน Code เป็น Access Token
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      });

      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        logger.error('OAuth2 Token Exchange Error:', tokenData);
        return res.redirect('/?error=token_failed');
      }

      // 2. ดึงข้อมูล User Profile จาก Discord API
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.id) {
        logger.error('OAuth2 User Fetch Error:', userData);
        return res.redirect('/?error=user_fetch_failed');
      }

      // 3. จัดเก็บข้อมูลลง Signed Cookie
      const sessionUser = {
        id: userData.id,
        username: userData.username,
        global_name: userData.global_name || userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
          : 'https://cdn-icons-png.flaticon.com/512/1069/1069210.png'
      };

      res.cookie('uryu_user', sessionUser, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
        signed: true,
        sameSite: 'lax',
        path: '/'
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
  app.get('/api/auth/user', async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.json({ loggedIn: false, user: null, isOwnerOfAny: false, ownedGuilds: [] });
    }

    // ตรวจสอบเซิร์ฟเวอร์ที่บอทอยู่ และผู้ใช้เป็นเจ้าของ หรือมีสิทธิ์แอดมิน
    const ownedGuilds = [];
    for (const g of client.guilds.cache.values()) {
      let isAuthorized = (g.ownerId === user.id);
      if (!isAuthorized) {
        try {
          const member = g.members.cache.get(user.id) || await g.members.fetch(user.id).catch(() => null);
          if (member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild))) {
            isAuthorized = true;
          }
        } catch {}
      }

      if (isAuthorized) {
        ownedGuilds.push({
          id: g.id,
          name: g.name
        });
      }
    }

    // Fallback: หากยังไม่พบด้วย permission ให้ตรวจสอบว่า user เป็นสมาชิกในเซิร์ฟเวอร์หรือไม่
    if (ownedGuilds.length === 0) {
      for (const g of client.guilds.cache.values()) {
        try {
          const member = g.members.cache.get(user.id) || await g.members.fetch(user.id).catch(() => null);
          if (member) {
            ownedGuilds.push({
              id: g.id,
              name: g.name
            });
          }
        } catch {}
      }
    }

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
    res.clearCookie('uryu_user', { path: '/' });
    res.redirect('/');
  });

  // ========================================================
  // 📊 Public Stats & Commands APIs (ทุกคนดูได้)
  // ========================================================

  /**
   * API: ดึงข้อมูลสถิติสดของบอทและสถานะเพลง (Live Stats)
   */
  app.get('/api/stats', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
        guildName: 'Discord Lounge'
      };

      if (client.distube) {
        const requestedGuildId = req.query.guildId;
        let activeQueue = null;

        // 1. ค้นหาจาก guildId ที่ระบุ (ต้องมีเพลงในคิว)
        if (requestedGuildId) {
          const q = client.distube.getQueue(requestedGuildId);
          if (q && q.songs && q.songs.length > 0) {
            activeQueue = q;
          }
        }

        // 2. หากยังไม่พบคิวที่มีเพลง ให้ค้นหาจากทุกเซิร์ฟเวอร์ที่บอทกำลังเล่นอยู่
        if (!activeQueue) {
          for (const guild of client.guilds.cache.values()) {
            const q = client.distube.getQueue(guild.id);
            if (q && q.songs && q.songs.length > 0) {
              activeQueue = q;
              break;
            }
          }
        }

        // 3. สำรองจาก Collection
        if (!activeQueue && client.distube.queues?.collection) {
          activeQueue = Array.from(client.distube.queues.collection.values()).find(q => q && q.songs && q.songs.length > 0);
        }

        if (activeQueue && activeQueue.songs && activeQueue.songs.length > 0) {
          const currentSong = activeQueue.songs[0];
          const totalSec = currentSong.duration || 1;
          const currentSec = activeQueue.currentTime || 0;
          const percent = Math.min(Math.max((currentSec / totalSec) * 100, 0), 100);
          const requester = currentSong.user || currentSong.member?.user || null;

          musicData = {
            isPlaying: true,
            songName: currentSong.name || 'ไม่ทราบชื่อเพลง',
            artist: currentSong.uploader?.name || currentSong.source || 'YouTube',
            thumbnail: currentSong.thumbnail || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif',
            duration: currentSong.formattedDuration || '00:00',
            currentTime: activeQueue.formattedCurrentTime || '00:00',
            progressPercent: Math.round(percent),
            isPaused: activeQueue.paused || false,
            volume: activeQueue.volume || 100,
            guildName: activeQueue.textChannel?.guild?.name || activeQueue.voiceChannel?.guild?.name || 'Discord Server',
            guildId: activeQueue.textChannel?.guildId || activeQueue.voiceChannel?.guildId || null,
            queueCount: activeQueue.songs.length,
            requesterId: requester ? requester.id : null,
            requesterName: requester ? (requester.global_name || requester.username) : 'สมาชิก Discord',
            requesterAvatar: requester ? (requester.displayAvatarURL?.({ dynamic: true }) || requester.avatarURL?.() || `https://cdn.discordapp.com/avatars/${requester.id}/${requester.avatar}.png?size=64`) : config.assets.securityIcon
          };
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
   * API: ดึงรายชื่อเซิร์ฟเวอร์ที่ User เป็นเจ้าของหรือผู้ดูแล (Server Owner & Admin)
   */
  app.get('/api/guilds', async (req, res) => {
    try {
      const user = getSessionUser(req);
      if (!user) {
        return res.json({ success: true, loggedIn: false, guilds: [] });
      }

      const authorizedGuilds = [];
      for (const guild of client.guilds.cache.values()) {
        let isAuthorized = (guild.ownerId === user.id);
        if (!isAuthorized) {
          try {
            const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
            if (member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild))) {
              isAuthorized = true;
            }
          } catch {}
        }

        if (isAuthorized) {
          authorizedGuilds.push({
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
          });
        }
      }

      // Fallback: หากยังไม่พบเซิร์ฟเวอร์ด้วยสิทธิ์แอดมิน ให้ค้นหาเซิร์ฟเวอร์ที่ user คนนี้เป็นสมาชิกอยู่
      if (authorizedGuilds.length === 0) {
        for (const guild of client.guilds.cache.values()) {
          try {
            const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
            if (member) {
              authorizedGuilds.push({
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
              });
            }
          } catch {}
        }
      }

      res.json({ success: true, loggedIn: true, guilds: authorizedGuilds });
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
        .setCustomId('btn_open_ticket')
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
   * Middleware: ตรวจสอบว่าผู้ใช้มีสิทธิ์ควบคุมเพลงหรือไม่
   * (ต้องเข้าสู่ระบบ และเป็นคนขอเพลงนี้ หรือ Server Owner หรือ Administrator)
   */
  async function requireMusicController(req, res, next) {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '🔒 กรุณาเข้าสู่ระบบด้วย Discord ก่อนจึงจะสามารถควบคุมเพลงได้'
      });
    }

    const { guildId } = req.body;
    let queue = null;
    if (guildId) queue = client.distube?.getQueue(guildId);
    if (!queue && client.distube?.queues?.collection) {
      queue = Array.from(client.distube.queues.collection.values()).find(q => q && q.songs && q.songs.length > 0);
    }

    if (!queue || !queue.songs || queue.songs.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีคิวเพลงที่กำลังเล่นอยู่ในขณะนี้' });
    }

    const currentSong = queue.songs[0];
    const requester = currentSong.user || currentSong.member?.user;
    const guild = queue.textChannel?.guild || queue.voiceChannel?.guild;

    let isAuthorized = false;

    // 1. เป็นคนที่ขอ/เปิดเพลงนี้
    if (requester && requester.id === user.id) {
      isAuthorized = true;
    }

    // 2. หรือเป็นเจ้าของเซิร์ฟเวอร์
    if (!isAuthorized && guild && guild.ownerId === user.id) {
      isAuthorized = true;
    }

    // 3. หรือเป็นแอดมินในเซิร์ฟเวอร์
    if (!isAuthorized && guild) {
      try {
        const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
        if (member && (
          member.permissions.has(PermissionFlagsBits.Administrator) ||
          member.permissions.has(PermissionFlagsBits.ManageGuild) ||
          member.permissions.has(PermissionFlagsBits.ManageChannels)
        )) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      const requesterName = requester ? (requester.global_name || requester.username) : 'คนเปิดเพลง';
      return res.status(403).json({
        success: false,
        error: `⛔ คุณไม่มีสิทธิ์ควบคุมเพลงนี้ (อนุญาตเฉพาะคุณ "${requesterName}" หรือผู้ดูแลเซิร์ฟเวอร์เท่านั้น)`
      });
    }

    req.user = user;
    req.queue = queue;
    next();
  }

  /**
   * API: สลับเล่น/พักเพลง (Music Toggle - Requester & Admin Only)
   */
  app.post('/api/actions/music-toggle', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      if (queue.paused) {
        queue.resume();
        res.json({ success: true, isPaused: false, message: 'เล่นเพลงต่อเรียบร้อย' });
      } else {
        queue.pause();
        res.json({ success: true, isPaused: true, message: 'พักการเล่นเพลงชั่วคราว' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ข้ามเพลง (Music Skip - Requester & Admin Only)
   */
  app.post('/api/actions/music-skip', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      if (queue.songs.length <= 1) {
        queue.stop();
        res.json({ success: true, message: 'เพลงสุดท้ายแล้ว หยุดเล่นเรียบร้อย' });
      } else {
        await queue.skip();
        res.json({ success: true, message: 'ข้ามไปยังเพลงถัดไปเรียบร้อย' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: เล่นเพลงก่อนหน้า (Music Previous - Requester & Admin Only)
   */
  app.post('/api/actions/music-previous', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      try {
        await queue.previous();
        res.json({ success: true, message: 'เล่นเพลงก่อนหน้าเรียบร้อย' });
      } catch {
        res.status(400).json({ success: false, error: 'ไม่มีประวัติเพลงก่อนหน้าในคิว' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: หยุดเล่นเพลง (Music Stop - Requester & Admin Only)
   */
  app.post('/api/actions/music-stop', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      await queue.stop();
      res.json({ success: true, message: 'หยุดเล่นเพลงและล้างคิวเรียบร้อย' });
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
    let displayUrl = `http://localhost:${port}`;
    if (config.bot.redirectUri) {
      try {
        const parsed = new URL(config.bot.redirectUri);
        displayUrl = `${parsed.protocol}//${parsed.host}`;
      } catch {}
    }

    logger.success(`==============================================`);
    logger.success(`🌐 Web Portal & Secure Dashboard ออนไลน์แล้วที่:`);
    logger.success(`👉 ${displayUrl}`);
    logger.success(`==============================================`);
  });

  return app;
}

module.exports = { startWebServer };
