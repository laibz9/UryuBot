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
              .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                isVoice: Boolean(c.isVoiceBased?.() || c.type === 2 || c.type === 13),
                isText: Boolean(c.isTextBased?.() || c.type === 0 || c.type === 5),
                isCategory: Boolean(c.type === 4)
              }))
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
   * API: ดึงข้อมูลคิวเพลงสดและสถานะการเล่น (Live Queue & Playback Status)
   */
  app.get('/api/music/queue/:guildId', (req, res) => {
    try {
      const { guildId } = req.params;
      const queue = client.distube?.getQueue(guildId);

      if (!queue || !queue.songs || queue.songs.length === 0) {
        return res.json({
          success: true,
          isPlaying: false,
          currentSong: null,
          currentTime: 0,
          duration: 0,
          volume: 100,
          repeatMode: 0,
          isPaused: false,
          queue: []
        });
      }

      const current = queue.songs[0];
      const songsList = queue.songs.map((s, idx) => ({
        index: idx,
        name: s.name,
        url: s.url,
        thumbnail: s.thumbnail,
        duration: s.duration,
        formattedDuration: s.formattedDuration,
        uploader: s.uploader?.name || 'Unknown',
        requester: s.user ? (s.user.global_name || s.user.username) : (s.member?.displayName || 'Unknown')
      }));

      res.json({
        success: true,
        isPlaying: true,
        isPaused: Boolean(queue.paused),
        currentTime: queue.currentTime || 0,
        formattedCurrentTime: queue.formattedCurrentTime || '00:00',
        duration: current.duration || 0,
        formattedDuration: current.formattedDuration || '00:00',
        volume: queue.volume || 100,
        repeatMode: queue.repeatMode || 0,
        currentSong: songsList[0],
        queue: songsList.slice(1)
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: สั่งเล่นเพลงจากหน้าเว็บ (Direct Web Play - Search & Play)
   */
  app.post('/api/music/play', requireServerOwner, async (req, res) => {
    try {
      const { guildId, voiceChannelId, textChannelId, query } = req.body;
      if (!query || !query.trim()) return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อเพลงหรือ URL' });

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์' });

      // หา Voice Channel
      let voiceChannel = null;
      if (voiceChannelId) {
        voiceChannel = guild.channels.cache.get(voiceChannelId);
      } else {
        // หาห้องเสียงแรกที่มีคนอยู่ หรือห้องเสียงแรกของเซิร์ฟเวอร์
        voiceChannel = guild.channels.cache.find(c => c.isVoiceBased() && c.members.size > 0) ||
                       guild.channels.cache.find(c => c.isVoiceBased());
      }

      if (!voiceChannel) {
        return res.status(400).json({ success: false, error: 'ไม่พบห้องเสียงที่จะให้บอทเข้าเล่นเพลง' });
      }

      // หา Text Channel
      const textChannel = (textChannelId && guild.channels.cache.get(textChannelId)) ||
                          guild.channels.cache.find(c => c.isTextBased()) || voiceChannel;

      const member = guild.members.cache.get(req.user.id) || await guild.members.fetch(req.user.id).catch(() => null);

      await client.distube.play(voiceChannel, query.trim(), {
        textChannel: textChannel,
        member: member || undefined
      });

      logger.success(`[Web DJ] (${req.user.username}) สั่งเล่นเพลง "${query}" ใน #${voiceChannel.name}`);
      res.json({ success: true, message: `เริ่มเล่นเพลง "${query}" ในห้องเสียง #${voiceChannel.name} เรียบร้อยแล้ว!` });
    } catch (error) {
      logger.error('[Web DJ Play Error]:', error);
      res.status(500).json({ success: false, error: error.message || 'ไม่สามารถเปิดเพลงได้' });
    }
  });

  /**
   * API: ปรับ Seek ข้ามเวลาเพลง (Music Seek)
   */
  app.post('/api/music/seek', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      const { position } = req.body;
      const posNumber = Number(position);
      if (isNaN(posNumber) || posNumber < 0) {
        return res.status(400).json({ success: false, error: 'ตำแหน่งเวลาไม่ถูกต้อง' });
      }

      queue.seek(posNumber);
      res.json({ success: true, message: `กระโดดไปยังเวลา ${Math.floor(posNumber)} วินาที เรียบร้อย` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ปรับระดับเสียง (Music Volume 0-100)
   */
  app.post('/api/music/volume', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      const { volume } = req.body;
      const volNumber = Math.max(0, Math.min(100, Number(volume) || 100));

      queue.setVolume(volNumber);
      res.json({ success: true, volume: volNumber, message: `ปรับระดับเสียงเป็น ${volNumber}% เรียบร้อย` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ปรับโหมดเล่นซ้ำ (Music Loop Mode: 0=Off, 1=Song, 2=Queue)
   */
  app.post('/api/music/loop', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      const { mode } = req.body;
      let nextMode = Number(mode);
      if (isNaN(nextMode) || nextMode < 0 || nextMode > 2) {
        nextMode = (queue.repeatMode + 1) % 3;
      }

      queue.setRepeatMode(nextMode);
      const modeNames = ['ปิดเล่นซ้ำ', '🔂 เล่นซ้ำเพลงนี้', '🔁 เล่นซ้ำทั้งคิว'];
      res.json({ success: true, repeatMode: nextMode, message: `เปลี่ยนโหมดวนซ้ำเป็น: ${modeNames[nextMode]}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: สลับคิวเพลงแบบสุ่ม (Music Shuffle)
   */
  app.post('/api/music/shuffle', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      if (queue.songs.length <= 2) {
        return res.status(400).json({ success: false, error: 'มีเพลงในคิวไม่เพียงพอสำหรับการสุ่ม' });
      }

      await queue.shuffle();
      res.json({ success: true, message: 'สลับลำดับคิวเพลงแบบสุ่มเรียบร้อยแล้ว 🔀' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ลบเพลงออกจากคิวตาม Index (Remove Song from Queue)
   */
  app.delete('/api/music/queue/:guildId/:index', requireMusicController, async (req, res) => {
    try {
      const queue = req.queue;
      const index = parseInt(req.params.index, 10);

      if (isNaN(index) || index <= 0 || index >= queue.songs.length) {
        return res.status(400).json({ success: false, error: 'ลำดับเพลงในคิวไม่ถูกต้อง' });
      }

      const removed = queue.songs.splice(index, 1);
      res.json({ success: true, message: `ลบเพลง "${removed[0]?.name}" ออกจากคิวเรียบร้อย` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ส่ง Custom Embed Studio ไปยังช่อง Discord (Interactive Embed Builder)
   */
  app.post('/api/embeds/send', requireServerOwner, async (req, res) => {
    try {
      const {
        guildId,
        channelId,
        title,
        titleUrl,
        description,
        color,
        authorName,
        authorIcon,
        authorUrl,
        thumbnail,
        image,
        footerText,
        footerIcon,
        showTimestamp
      } = req.body;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์' });

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ success: false, error: 'กรุณาเลือกช่องข้อความที่ถูกต้อง' });
      }

      const embed = new EmbedBuilder();

      if (title && title.trim()) embed.setTitle(title.trim());
      if (titleUrl && titleUrl.startsWith('http')) embed.setURL(titleUrl.trim());
      if (description && description.trim()) embed.setDescription(description.trim());
      embed.setColor(color || config.colors.accent);

      if (authorName && authorName.trim()) {
        embed.setAuthor({
          name: authorName.trim(),
          iconURL: (authorIcon && authorIcon.startsWith('http')) ? authorIcon.trim() : undefined,
          url: (authorUrl && authorUrl.startsWith('http')) ? authorUrl.trim() : undefined
        });
      }

      if (thumbnail && thumbnail.startsWith('http')) embed.setThumbnail(thumbnail.trim());
      if (image && image.startsWith('http')) embed.setImage(image.trim());

      if (footerText && footerText.trim()) {
        embed.setFooter({
          text: footerText.trim(),
          iconURL: (footerIcon && footerIcon.startsWith('http')) ? footerIcon.trim() : undefined
        });
      }

      if (showTimestamp) {
        embed.setTimestamp();
      }

      await channel.send({ embeds: [embed] });
      logger.success(`[Embed Studio] (${req.user.username}) ส่ง Custom Embed เข้า #${channel.name}`);
      res.json({ success: true, message: `ส่งประกาศ Embed เข้าห้อง #${channel.name} สำเร็จแล้ว! 🚀` });
    } catch (error) {
      logger.error('[Embed Studio Error]:', error);
      res.status(500).json({ success: false, error: error.message || 'ส่งข้อความไม่สำเร็จ' });
    }
  });

  /**
   * API: ดึงรายชื่อสมาชิกในเซิร์ฟเวอร์สำหรับ Quick Moderation
   */
  app.get('/api/guilds/:guildId/members', requireServerOwner, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์' });

      // ดึงสมาชิกล่าสุดจาก Cache และ Fetch สูงสุด 100 คน
      await guild.members.fetch({ limit: 100 }).catch(() => null);

      const membersList = guild.members.cache.map(m => ({
        id: m.id,
        tag: m.user.tag,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL({ dynamic: true, size: 64 }),
        isBot: m.user.bot,
        isOwner: guild.ownerId === m.id,
        isTimedOut: m.isCommunicationDisabled(),
        roles: m.roles.cache
          .filter(r => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
          .slice(0, 5),
        joinedTimestamp: m.joinedTimestamp
      }));

      res.json({ success: true, count: membersList.length, members: membersList });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * API: ดำเนินการ Quick Moderation จากหน้าเว็บ (Kick, Ban, Timeout)
   */
  app.post('/api/moderation/action', requireServerOwner, async (req, res) => {
    try {
      const { guildId, action, targetUserId, reason, durationMs, deleteMessages } = req.body;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์' });

      if (!targetUserId) return res.status(400).json({ success: false, error: 'ไม่พบเป้าหมายผู้ใช้' });

      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
      const actionReason = reason || `สั่งการผ่าน Web Dashboard โดย ${req.user.username}`;

      if (action === 'kick') {
        if (!targetMember) return res.status(404).json({ success: false, error: 'ไม่พบสมาชิกในเซิร์ฟเวอร์' });
        await targetMember.kick(actionReason);
        logger.info(`[Web Mod] ${req.user.username} สั่งเตะ ${targetMember.user.tag}`);
        return res.json({ success: true, message: `เตะ ${targetMember.user.tag} ออกจากเซิร์ฟเวอร์เรียบร้อย` });
      }

      if (action === 'ban') {
        await guild.members.ban(targetUserId, {
          deleteMessageSeconds: Number(deleteMessages) || 0,
          reason: actionReason
        });
        logger.info(`[Web Mod] ${req.user.username} สั่งแบน User ID: ${targetUserId}`);
        return res.json({ success: true, message: `แบนผู้ใช้ (ID: ${targetUserId}) ออกจากเซิร์ฟเวอร์เรียบร้อย` });
      }

      if (action === 'timeout') {
        if (!targetMember) return res.status(404).json({ success: false, error: 'ไม่พบสมาชิกในเซิร์ฟเวอร์' });
        const timeMs = Number(durationMs) || (5 * 60 * 1000);
        await targetMember.timeout(timeMs, actionReason);
        logger.info(`[Web Mod] ${req.user.username} สั่ง Timeout ${targetMember.user.tag} (${timeMs / 1000}s)`);
        return res.json({ success: true, message: `ปิดการใช้งานแชท ${targetMember.user.tag} เป็นเวลา ${timeMs / 60000} นาที เรียบร้อย` });
      }

      if (action === 'untimeout') {
        if (!targetMember) return res.status(404).json({ success: false, error: 'ไม่พบสมาชิกในเซิร์ฟเวอร์' });
        await targetMember.timeout(null, actionReason);
        logger.info(`[Web Mod] ${req.user.username} สั่งยกเลิก Timeout ให้ ${targetMember.user.tag}`);
        return res.json({ success: true, message: `ยกเลิกการปิดแชทให้ ${targetMember.user.tag} เรียบร้อย` });
      }

      res.status(400).json({ success: false, error: 'คำสั่ง Action ไม่ถูกต้อง' });
    } catch (error) {
      logger.error('[Web Mod Error]:', error);
      res.status(500).json({ success: false, error: error.message || 'ดำเนินการไม่สำเร็จ' });
    }
  });

  /**
   * API: ดึงประวัติ Audit Logs จากเซิร์ฟเวอร์
   */
  app.get('/api/guilds/:guildId/audit-logs', requireServerOwner, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ success: false, error: 'ไม่พบเซิร์ฟเวอร์' });

      const logs = await guild.fetchAuditLogs({ limit: 15 }).catch(() => null);
      if (!logs) return res.json({ success: true, entries: [] });

      const entries = logs.entries.map(e => ({
        id: e.id,
        action: e.action,
        actionName: String(e.action),
        executor: e.executor ? { id: e.executor.id, tag: e.executor.tag, username: e.executor.username, avatar: e.executor.displayAvatarURL() } : null,
        target: e.target ? { id: e.target.id, tag: e.target.tag || e.target.name || 'Target' } : null,
        reason: e.reason || 'ไม่ได้ระบุเหตุผล',
        createdTimestamp: e.createdTimestamp
      }));

      res.json({ success: true, count: entries.length, entries });
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
