/**
 * @file src/web/public/app.js
 * @description Script จัดการ Web Setup Dashboard, Discord OAuth2 Login, Realtime Polling, และ MySQL Sync
 */

document.addEventListener('DOMContentLoaded', () => {
  /**
   * แปลงจำนวนวินาทีเป็นสตริงเวลา MM:SS หรือ HH:MM:SS
   */
  function formatTimeSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  let allCommands = [];
  let allGuilds = [];
  let currentGuildId = '';
  let currentCategory = 'all';
  let currentUser = null;
  let isLockdownActive = false;

  // DOM Elements - Nav & Hero
  const pingValue = document.getElementById('ping-value');
  const navBotAvatar = document.getElementById('nav-bot-avatar');
  const heroBotAvatar = document.getElementById('hero-bot-avatar');
  const botNameDisplay = document.getElementById('bot-name-display');
  const botTagDisplay = document.getElementById('bot-tag-display');
  const btnInvite = document.getElementById('btn-invite');
  const btnHeroInvite = document.getElementById('btn-hero-invite');
  const authNavContainer = document.getElementById('auth-nav-container');

  // Stats Elements
  const statGuilds = document.getElementById('stat-guilds');
  const statMembers = document.getElementById('stat-members');
  const statPing = document.getElementById('stat-ping');
  const statUptime = document.getElementById('stat-uptime');

  // Music Widget Elements
  const musicCover = document.getElementById('music-cover');
  const musicBadgeText = document.getElementById('music-badge-text');
  const musicGuildName = document.getElementById('music-guild-name');
  const musicSongName = document.getElementById('music-song-name');
  const musicArtistName = document.getElementById('music-artist-name');
  const visualizer = document.getElementById('visualizer');
  const musicProgressFill = document.getElementById('music-progress-fill');
  const musicCurrentTime = document.getElementById('music-current-time');
  const musicDuration = document.getElementById('music-duration');
  const musicPlayBtn = document.getElementById('music-play-btn');
  const musicPrevBtn = document.getElementById('music-prev-btn');
  const musicNextBtn = document.getElementById('music-next-btn');
  const musicStopBtn = document.getElementById('music-stop-btn');
  const musicVolText = document.getElementById('music-vol-text');
  const musicRequesterBox = document.getElementById('music-requester-box');
  const musicRequesterAvatar = document.getElementById('music-requester-avatar');
  const musicRequesterName = document.getElementById('music-requester-name');

  // Dashboard & Auth State Elements
  const dashboardLockOverlay = document.getElementById('dashboard-lock-overlay');
  const dashboardContent = document.getElementById('dashboard-content');
  const lockMessage = document.getElementById('lock-message');
  const ownerAvatarImg = document.getElementById('owner-avatar-img');
  const ownerNameDisplay = document.getElementById('owner-name-display');

  // Dashboard Settings Elements
  const guildSelector = document.getElementById('guild-selector');
  const cfgVerifiedRole = document.getElementById('cfg-verified-role');
  const cfgLeaderRole = document.getElementById('cfg-leader-role');
  const cfgAdminRole = document.getElementById('cfg-admin-role');
  const cfgModeratorRole = document.getElementById('cfg-moderator-role');
  const cfgSupportRole = document.getElementById('cfg-support-role');

  const cfgVerifyChannel = document.getElementById('cfg-verify-channel');
  const cfgWelcomeChannel = document.getElementById('cfg-welcome-channel');
  const cfgGoodbyeChannel = document.getElementById('cfg-goodbye-channel');
  const cfgLogChannel = document.getElementById('cfg-log-channel');
  const cfgMusicChannel = document.getElementById('cfg-music-channel');
  const cfgTicketChannel = document.getElementById('cfg-ticket-channel');
  const cfgTicketCategory = document.getElementById('cfg-ticket-category');

  const cfgEnableWelcome = document.getElementById('cfg-enable-welcome');
  const cfgEnableLogs = document.getElementById('cfg-enable-logs');
  const cfgEnableAdminCmds = document.getElementById('cfg-enable-admin-cmds');
  const cfgEnableModCmds = document.getElementById('cfg-enable-mod-cmds');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const saveStatus = document.getElementById('save-status');

  // Remote Actions Elements
  const btnActionVerify = document.getElementById('btn-action-verify');
  const btnActionTicket = document.getElementById('btn-action-ticket');
  const btnActionMusic = document.getElementById('btn-action-music');
  const btnActionLockdown = document.getElementById('btn-action-lockdown');

  // Announcement Elements
  const annChannel = document.getElementById('ann-channel');
  const annTitle = document.getElementById('ann-title');
  const annDesc = document.getElementById('ann-desc');
  const annColor = document.getElementById('ann-color');
  const annImage = document.getElementById('ann-image');
  const btnSendAnnouncement = document.getElementById('btn-send-announcement');

  // Commands Explorer Elements
  const commandsContainer = document.getElementById('commands-container');
  const cmdSearchInput = document.getElementById('cmd-search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const toastContainer = document.getElementById('toast-container');

  /**
   * แสดง Toast Notification แจ้งเตือนสวยงาม
   */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>' : '<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red);"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * ตรวจสอบ Error จาก URL Query String และแจ้งเตือนผู้ใช้
   */
  function checkUrlErrors() {
    const urlParams = new URLSearchParams(window.location.search);
    const err = urlParams.get('error');
    if (err) {
      let msg = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ Discord';
      if (err === 'token_failed') {
        msg = 'การยืนยันตัวตนกับ Discord ล้มเหลว (กรุณากดปุ่ม Login ใหม่อีกครั้ง)';
      } else if (err === 'missing_client_secret') {
        msg = 'ไม่พบค่า CLIENT_SECRET ในไฟล์ .env ของบอท';
      } else if (err === 'user_fetch_failed') {
        msg = 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก Discord ได้';
      }
      showToast(msg, 'error');
      // ล้าง query string ออกจาก address bar ให้สะอาด
      window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || ''));
    }
  }

  /**
   * ตรวจสอบสถานะการเข้าสู่ระบบผ่าน Discord OAuth2 (/api/auth/user)
   */
  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.loggedIn && data.user) {
        currentUser = data.user;

        // 1. อัปเดตส่วน Auth บน Navbar เป็น User Pill
        authNavContainer.innerHTML = `
          <div class="user-nav-pill">
            <img src="${currentUser.avatar}" alt="User Avatar" class="user-nav-avatar">
            <span class="user-nav-name">${currentUser.global_name || currentUser.username}</span>
            <a href="/api/auth/logout" class="user-nav-logout" title="ออกจากระบบ"><i class="fa-solid fa-right-from-bracket"></i> ออก</a>
          </div>
        `;

        // 2. ตรวจสอบสิทธิ์ว่ามีเซิร์ฟเวอร์ที่ดูแลหรือไม่
        const hasGuilds = data.isOwnerOfAny || (data.ownedGuilds && data.ownedGuilds.length > 0) || (data.ownedGuildsCount > 0);
        if (hasGuilds) {
          dashboardLockOverlay.style.display = 'none';
          dashboardContent.style.display = 'block';

          ownerAvatarImg.src = currentUser.avatar;
          ownerNameDisplay.textContent = currentUser.global_name || currentUser.username;

          await fetchGuilds();
        } else {
          // ล็อกอินแล้วแต่ยังไม่มีเซิร์ฟเวอร์ที่บอทอยู่
          dashboardLockOverlay.style.display = 'block';
          dashboardContent.style.display = 'none';
          lockMessage.innerHTML = `⚠️ บัญชี Discord ของคุณ (<strong>${currentUser.username}</strong>) เข้าสู่ระบบสำเร็จแล้ว แต่ยังไม่มีเซิร์ฟเวอร์ที่บอทประจำการอยู่ กรุณาเชิญบอทเข้าเซิร์ฟเวอร์ของคุณก่อนครับ`;
        }
      } else {
        // ยังไม่ได้เข้าสู่ระบบ
        currentUser = null;
        authNavContainer.innerHTML = `
          <a href="/api/auth/login" class="btn btn-discord btn-sm">
            <i class="fa-brands fa-discord"></i> เข้าสู่ระบบด้วย Discord
          </a>
        `;
        dashboardLockOverlay.style.display = 'block';
        dashboardContent.style.display = 'none';
      }
    } catch (err) {
      console.warn('ไม่สามารถตรวจสอบ Auth Status ได้:', err);
    }
  }

  let currentPlayingGuildId = null;

  /**
   * ดึงข้อมูลสถิติสดและสถานะเพลงจาก REST API (/api/stats) แบบ Realtime
   */
  async function fetchLiveStats() {
    try {
      const res = await fetch(`/api/stats?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        if (data.bot) {
          if (data.bot.avatar) {
            if (navBotAvatar) navBotAvatar.src = data.bot.avatar;
            if (heroBotAvatar) heroBotAvatar.src = data.bot.avatar;
          }
          if (data.bot.name && botNameDisplay) botNameDisplay.textContent = data.bot.name;
          if (data.bot.tag && botTagDisplay) botTagDisplay.textContent = data.bot.tag;
          if (data.bot.inviteUrl) {
            if (btnInvite) btnInvite.href = data.bot.inviteUrl;
            if (btnHeroInvite) btnHeroInvite.href = data.bot.inviteUrl;
          }
        }

        if (data.stats) {
          if (statGuilds) statGuilds.textContent = data.stats.guildCount.toLocaleString();
          if (statMembers) statMembers.textContent = data.stats.totalMembers.toLocaleString();
          if (statPing) statPing.textContent = `${data.stats.ping} ms`;
          if (pingValue) pingValue.textContent = `${data.stats.ping} ms`;
          if (statUptime) statUptime.textContent = data.stats.uptimeFormatted;
        }

        if (data.music) {
          const m = data.music;
          if (m.isPlaying) {
            currentPlayingGuildId = m.guildId;
            if (musicCover && m.thumbnail) musicCover.src = m.thumbnail;
            if (musicBadgeText) musicBadgeText.textContent = m.isPaused ? 'Paused' : 'Playing Now';
            if (musicGuildName) musicGuildName.textContent = m.guildName;
            if (musicSongName) musicSongName.textContent = m.songName;
            if (musicArtistName) musicArtistName.textContent = `${m.artist} • ${m.queueCount || 1} เพลงในคิว`;
            if (musicCurrentTime) musicCurrentTime.textContent = m.currentTime;
            if (musicDuration) musicDuration.textContent = m.duration;
            if (musicProgressFill) musicProgressFill.style.width = `${m.progressPercent}%`;

            if (musicRequesterBox) musicRequesterBox.style.display = 'inline-flex';
            if (musicRequesterName) musicRequesterName.textContent = m.requesterName || '-';
            if (musicRequesterAvatar && m.requesterAvatar) musicRequesterAvatar.src = m.requesterAvatar;

            if (visualizer) {
              if (!m.isPaused) visualizer.classList.add('active');
              else visualizer.classList.remove('active');
            }

            if (musicPlayBtn) {
              if (!m.isPaused) {
                musicPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                musicPlayBtn.title = 'พักเพลงชั่วคราว';
              } else {
                musicPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                musicPlayBtn.title = 'เล่นต่อ';
              }
            }

            if (musicVolText && m.volume !== undefined) {
              musicVolText.textContent = `${m.volume}%`;
            }
          } else {
            currentPlayingGuildId = null;
            if (musicCover) musicCover.src = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif';
            if (musicBadgeText) musicBadgeText.textContent = 'Standby';
            if (musicGuildName) musicGuildName.textContent = 'Discord Lounge';
            if (musicSongName) musicSongName.textContent = 'ยังไม่มีเพลงที่กำลังเล่น';
            if (musicArtistName) musicArtistName.textContent = 'Uryu Music System • 48kHz Stereo';
            if (musicCurrentTime) musicCurrentTime.textContent = '00:00';
            if (musicDuration) musicDuration.textContent = '00:00';
            if (musicProgressFill) musicProgressFill.style.width = '0%';
            if (visualizer) visualizer.classList.remove('active');
            if (musicPlayBtn) {
              musicPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
              musicPlayBtn.title = 'ยังไม่มีเพลงเล่น';
            }
            if (musicVolText) musicVolText.textContent = '100%';
            if (musicRequesterBox) musicRequesterBox.style.display = 'none';
          }
        }

        // Also refresh DJ Deck when Live DJ Studio tab is active
        const djTabPane = document.getElementById('tab-pane-dj');
        if (djTabPane && djTabPane.classList.contains('active')) {
          fetchDjQueue();
        }
      }
    } catch (err) {
      console.warn('ไม่สามารถเชื่อมต่อ API /api/stats ได้ชั่วคราว:', err);
    }
  }

  // ปุ่มกดเล่น/พักเพลงบน Web Widget
  if (musicPlayBtn) {
    musicPlayBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentPlayingGuildId || currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchLiveStats();
        } else {
          showToast(data.error || 'ไม่สามารถควบคุมเพลงได้', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
  }

  // ปุ่มกดข้ามเพลง (Next Song)
  if (musicNextBtn) {
    musicNextBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentPlayingGuildId || currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchLiveStats();
        } else {
          showToast(data.error || 'ไม่สามารถข้ามเพลงได้', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
  }

  // ปุ่มกดเล่นเพลงก่อนหน้า (Previous Song)
  if (musicPrevBtn) {
    musicPrevBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-previous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentPlayingGuildId || currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchLiveStats();
        } else {
          showToast(data.error || 'ไม่มีประวัติเพลงก่อนหน้า', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
  }

  // ปุ่มกดหยุดเล่นเพลง (Stop Music)
  if (musicStopBtn) {
    musicStopBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentPlayingGuildId || currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          fetchLiveStats();
        } else {
          showToast(data.error || 'ไม่สามารถหยุดเล่นเพลงได้', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
  }

  /**
   * ดึงรายชื่อเซิร์ฟเวอร์ที่ User เป็นเจ้าของหรือดูแล (/api/guilds)
   */
  async function fetchGuilds() {
    try {
      const res = await fetch('/api/guilds', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.guilds && data.guilds.length > 0) {
        allGuilds = data.guilds;
        
        guildSelector.innerHTML = allGuilds.map(g => `
          <option value="${g.id}">🏰 ${g.name} (${g.memberCount.toLocaleString()} สมาชิก)</option>
        `).join('');

        currentGuildId = allGuilds[0].id;
        guildSelector.value = currentGuildId;
        
        // โหลดข้อมูลช่องและยศของเซิร์ฟเวอร์แรกทันทีแบบอัตโนมัติ
        populateGuildOptions(allGuilds[0]);
        await loadGuildSettings(currentGuildId);
        await updateStudioChannelDropdowns(allGuilds[0]);
        fetchDjQueue();
      } else {
        guildSelector.innerHTML = '<option value="">ไม่พบเซิร์ฟเวอร์ที่บอทประจำการอยู่</option>';
      }
    } catch (err) {
      console.error('ไม่สามารถโหลดข้อมูลเซิร์ฟเวอร์ได้:', err);
    }
  }

  /**
   * เติมตัวเลือก Channels และ Roles ของเซิร์ฟเวอร์ที่เลือก
   */
  function populateGuildOptions(guild) {
    if (!guild) return;

    const roles = guild.roles || [];
    const roleOptions = [
      '<option value="">-- ไม่กำหนดยศ (None) --</option>',
      ...roles.map(r => `<option value="${r.id}">🛡️ ${r.name}</option>`)
    ].join('');

    if (cfgVerifiedRole) cfgVerifiedRole.innerHTML = roleOptions;
    if (cfgLeaderRole) cfgLeaderRole.innerHTML = roleOptions;
    if (cfgAdminRole) cfgAdminRole.innerHTML = roleOptions;
    if (cfgModeratorRole) cfgModeratorRole.innerHTML = roleOptions;
    if (cfgSupportRole) cfgSupportRole.innerHTML = roleOptions;

    const channels = guild.channels || [];
    const textChannels = channels.filter(c => c.isText || c.type === 0 || c.type === 5 || (!c.isVoice && c.type !== 4 && c.type !== 2 && c.type !== 13));
    const channelOptions = [
      '<option value="">-- ไม่กำหนดช่อง (None) --</option>',
      ...textChannels.map(c => `<option value="${c.id}"># ${c.name}</option>`)
    ].join('');

    if (cfgVerifyChannel) cfgVerifyChannel.innerHTML = channelOptions;
    if (cfgWelcomeChannel) cfgWelcomeChannel.innerHTML = channelOptions;
    if (cfgGoodbyeChannel) cfgGoodbyeChannel.innerHTML = channelOptions;
    if (cfgLogChannel) cfgLogChannel.value = '';
    if (cfgLogChannel) cfgLogChannel.innerHTML = channelOptions;
    if (cfgMusicChannel) cfgMusicChannel.innerHTML = channelOptions;
    if (cfgTicketChannel) cfgTicketChannel.innerHTML = channelOptions;
    if (annChannel) annChannel.innerHTML = channelOptions;

    const categoryChannels = channels.filter(c => c.type === 4);
    const categoryOptions = [
      '<option value="">-- ไม่กำหนดหมวดหมู่ (None) --</option>',
      ...categoryChannels.map(c => `<option value="${c.id}">📁 ${c.name}</option>`),
      ...textChannels.map(c => `<option value="${c.id}"># ${c.name}</option>`)
    ].join('');

    if (cfgTicketCategory) cfgTicketCategory.innerHTML = categoryOptions;
  }

  /**
   * ดึงการตั้งค่าของเซิร์ฟเวอร์จาก MySQL (/api/settings/:guildId) แบบ Realtime
   */
  async function loadGuildSettings(guildId) {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/settings/${guildId}?t=${Date.now()}`, { credentials: 'include' });
      if (!res.ok) {
        console.warn(`[Settings] HTTP ${res.status} when loading settings for ${guildId}`);
        return;
      }
      const data = await res.json();
      console.log(`[Settings] Loaded for ${guildId}:`, data);

      if (data.success && data.settings) {
        const s = data.settings;

        if (cfgVerifiedRole) cfgVerifiedRole.value = s.verifiedRoleId || '';
        if (cfgLeaderRole) cfgLeaderRole.value = s.leaderRoleId || '';
        if (cfgAdminRole) cfgAdminRole.value = s.adminRoleId || '';
        if (cfgModeratorRole) cfgModeratorRole.value = s.moderatorRoleId || '';
        if (cfgSupportRole) cfgSupportRole.value = s.supportRoleId || '';

        if (cfgVerifyChannel) cfgVerifyChannel.value = s.verifyChannelId || '';
        if (cfgWelcomeChannel) cfgWelcomeChannel.value = s.welcomeChannelId || '';
        if (cfgGoodbyeChannel) cfgGoodbyeChannel.value = s.goodbyeChannelId || '';
        if (cfgLogChannel) cfgLogChannel.value = s.logChannelId || '';
        if (cfgMusicChannel) cfgMusicChannel.value = s.musicChannelId || '';
        if (cfgTicketChannel) cfgTicketChannel.value = s.ticketChannelId || '';
        if (cfgTicketCategory) cfgTicketCategory.value = s.ticketCategoryId || '';

        // Toggles State Update
        const isWelcomeOn = (s.enableWelcomeSystem === 1 || s.enableWelcomeSystem === true || s.enableWelcomeSystem === '1');
        const isLogsOn = (s.enableLogSystem === 1 || s.enableLogSystem === true || s.enableLogSystem === '1');
        const isAdminCmdsOn = (s.enableAdminCommands === 1 || s.enableAdminCommands === true || s.enableAdminCommands === '1' || s.enableAdminCommands === undefined);
        const isModCmdsOn = (s.enableModerationCommands === 1 || s.enableModerationCommands === true || s.enableModerationCommands === '1' || s.enableModerationCommands === undefined);

        if (cfgEnableWelcome) cfgEnableWelcome.checked = isWelcomeOn;
        if (cfgEnableLogs) cfgEnableLogs.checked = isLogsOn;
        if (cfgEnableAdminCmds) cfgEnableAdminCmds.checked = isAdminCmdsOn;
        if (cfgEnableModCmds) cfgEnableModCmds.checked = isModCmdsOn;

        if (saveStatus) {
          saveStatus.textContent = `อัปเดตล่าสุด: ${s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : 'ค่าเริ่มต้น'}`;
        }
      }
    } catch (err) {
      console.error('[Settings Error]:', err);
    }
  }

  // Event: เปลี่ยนเซิร์ฟเวอร์ที่เลือก (Single Unified Handler)
  if (guildSelector) {
    guildSelector.onchange = async (e) => {
      currentGuildId = e.target.value;
      const selectedGuild = allGuilds.find(g => g.id === currentGuildId);
      if (selectedGuild) {
        populateGuildOptions(selectedGuild);
        await loadGuildSettings(currentGuildId);
        await updateStudioChannelDropdowns(selectedGuild);
        fetchDjQueue();
        showToast(`เปลี่ยนเซิร์ฟเวอร์เป็น: ${selectedGuild.name}`);
      }
    };
  }

  // Event: บันทึกการตั้งค่าลงฐานข้อมูล MySQL
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      if (!currentGuildId) {
        showToast('กรุณาเลือกเซิร์ฟเวอร์ก่อน', 'error');
        return;
      }

      btnSaveSettings.disabled = true;
      btnSaveSettings.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึกลง MySQL...';

      const payload = {
        verifiedRoleId: cfgVerifiedRole ? cfgVerifiedRole.value : null,
        leaderRoleId: cfgLeaderRole ? cfgLeaderRole.value : null,
        adminRoleId: cfgAdminRole ? cfgAdminRole.value : null,
        moderatorRoleId: cfgModeratorRole ? cfgModeratorRole.value : '',
        supportRoleId: cfgSupportRole ? cfgSupportRole.value : '',
        verifyChannelId: cfgVerifyChannel ? cfgVerifyChannel.value : null,
        welcomeChannelId: cfgWelcomeChannel ? cfgWelcomeChannel.value : null,
        goodbyeChannelId: cfgGoodbyeChannel ? cfgGoodbyeChannel.value : null,
        logChannelId: cfgLogChannel ? cfgLogChannel.value : null,
        musicChannelId: cfgMusicChannel ? cfgMusicChannel.value : null,
        ticketChannelId: cfgTicketChannel ? cfgTicketChannel.value : '',
        ticketCategoryId: cfgTicketCategory ? cfgTicketCategory.value : '',
        enableWelcomeSystem: cfgEnableWelcome ? cfgEnableWelcome.checked : false,
        enableLogSystem: cfgEnableLogs ? cfgEnableLogs.checked : false,
        enableAdminCommands: cfgEnableAdminCmds ? cfgEnableAdminCmds.checked : true,
        enableModerationCommands: cfgEnableModCmds ? cfgEnableModCmds.checked : true
      };

      try {
        const res = await fetch(`/api/settings/${currentGuildId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast('บันทึกการตั้งค่าลงฐานข้อมูล MySQL เรียบร้อยแล้ว! ✅');
          if (saveStatus) saveStatus.textContent = `บันทึกแล้วเมื่อ ${new Date().toLocaleTimeString()}`;
        } else {
          showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
      } finally {
        btnSaveSettings.disabled = false;
        btnSaveSettings.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่าลง MySQL';
      }
    });
  }

  // Remote Action: ส่งแผงยืนยันตัวตน
  if (btnActionVerify) {
    btnActionVerify.addEventListener('click', async () => {
      const channelId = (cfgVerifyChannel && cfgVerifyChannel.value) || (cfgWelcomeChannel && cfgWelcomeChannel.value) || (cfgLogChannel && cfgLogChannel.value);
      if (!channelId) {
        showToast('กรุณาเลือกช่องในส่วนการตั้งค่าก่อน', 'error');
        return;
      }

      try {
        const res = await fetch('/api/actions/send-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId, channelId })
        });
        const data = await res.json();
        if (data.success) showToast(data.message);
        else showToast(data.error, 'error');
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการส่ง', 'error');
      }
    });
  }

  // Remote Action: ส่งแผงเปิดทิกเก็ต
  if (btnActionTicket) {
    btnActionTicket.addEventListener('click', async () => {
      const channelId = (cfgTicketChannel && cfgTicketChannel.value) || (cfgVerifyChannel && cfgVerifyChannel.value);
      if (!channelId) {
        showToast('กรุณาเลือก "ช่องส่งแผงทิกเก็ต (Ticket Channel)" ในส่วนตั้งค่าก่อนกดส่ง', 'error');
        return;
      }

      try {
        const res = await fetch('/api/actions/send-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId, channelId })
        });
        const data = await res.json();
        if (data.success) showToast(data.message);
        else showToast(data.error, 'error');
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการส่งแผงทิกเก็ต', 'error');
      }
    });
  }

  // Remote Action: ติดตั้งห้องขอเพลง
  if (btnActionMusic) {
    btnActionMusic.addEventListener('click', async () => {
      const channelId = cfgMusicChannel ? cfgMusicChannel.value : null;
      if (!channelId) {
        showToast('กรุณาเลือกช่องสำหรับห้องขอเพลงก่อน', 'error');
        return;
      }

      try {
        const res = await fetch('/api/actions/setup-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId, channelId })
        });
        const data = await res.json();
        if (data.success) showToast(data.message);
        else showToast(data.error, 'error');
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการติดตั้ง', 'error');
      }
    });
  }

  // Remote Action: ล็อกดาวน์ฉุกเฉิน
  if (btnActionLockdown) {
    btnActionLockdown.addEventListener('click', async () => {
      isLockdownActive = !isLockdownActive;

      try {
        const res = await fetch('/api/actions/lockdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guildId: currentGuildId,
            channelId: 'all',
            enable: isLockdownActive
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, isLockdownActive ? 'error' : 'success');
          btnActionLockdown.innerHTML = isLockdownActive 
            ? '<i class="fa-solid fa-lock-open"></i> ปลดล็อกดาวน์'
            : '<i class="fa-solid fa-triangle-exclamation"></i> สลับสถานะ Lockdown';
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะล็อกดาวน์', 'error');
      }
    });
  }

  // Remote Action: ส่งประกาศข่าวสาร
  if (btnSendAnnouncement) {
    btnSendAnnouncement.addEventListener('click', async () => {
      const channelId = annChannel ? annChannel.value : null;
      const title = annTitle ? annTitle.value.trim() : '';
      const description = annDesc ? annDesc.value.trim() : '';

      if (!channelId) {
        showToast('กรุณาเลือกช่องสำหรับส่งประกาศ', 'error');
        return;
      }
      if (!title || !description) {
        showToast('กรุณากรอกหัวข้อและเนื้อหาประกาศ', 'error');
        return;
      }

      btnSendAnnouncement.disabled = true;
      btnSendAnnouncement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังส่งประกาศ...';

      try {
        const res = await fetch('/api/actions/announce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guildId: currentGuildId,
            channelId,
            title,
            description,
            color: annColor ? annColor.value : '#00F0FF',
            image: annImage ? annImage.value.trim() : ''
          })
        });

        const data = await res.json();
        if (data.success) {
          showToast('ส่งประกาศเข้าเซิร์ฟเวอร์เรียบร้อยแล้ว! 📢');
          if (annTitle) annTitle.value = '';
          if (annDesc) annDesc.value = '';
          if (annImage) annImage.value = '';
        } else {
          showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast('ไม่สามารถส่งประกาศได้', 'error');
      } finally {
        btnSendAnnouncement.disabled = false;
        btnSendAnnouncement.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งประกาศเข้าเซิร์ฟเวอร์ทันที';
      }
    });
  }

  // ================= Studio Tab Switcher =================
  const studioTabBtns = document.querySelectorAll('.studio-tab-btn');
  const studioTabPanes = document.querySelectorAll('.studio-tab-pane');

  if (studioTabBtns) {
    studioTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        studioTabBtns.forEach(b => b.classList.remove('active'));
        studioTabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(`tab-pane-${tab}`);
        if (targetPane) targetPane.classList.add('active');

        const selectedGuild = allGuilds.find(g => g.id === currentGuildId) || allGuilds[0];
        if (selectedGuild) {
          updateStudioChannelDropdowns(selectedGuild);
        }

        if (tab === 'dj') {
          fetchDjQueue();
        } else if (tab === 'embed') {
          updateEmbedPreview();
        } else if (tab === 'mod') {
          fetchGuildMembers();
          fetchGuildAuditLogs();
        }
      });
    });
  }

  // ================= TAB 2: Live Web DJ Studio Logic =================
  const djSearchInput = document.getElementById('dj-search-input');
  const djVoiceChannel = document.getElementById('dj-voice-channel');
  const btnDjPlay = document.getElementById('btn-dj-play');
  const djCoverImg = document.getElementById('dj-cover-img');
  const djStatusBadge = document.getElementById('dj-status-badge');
  const djBadgeText = document.getElementById('dj-badge-text');
  const djTrackTitle = document.getElementById('dj-track-title');
  const djTrackArtist = document.getElementById('dj-track-artist');
  const djTrackRequester = document.getElementById('dj-track-requester');
  const djTimeCur = document.getElementById('dj-time-cur');
  const djTimeTotal = document.getElementById('dj-time-total');
  const djSeekSlider = document.getElementById('dj-seek-slider');
  const btnDjPrev = document.getElementById('btn-dj-prev');
  const btnDjToggle = document.getElementById('btn-dj-toggle');
  const btnDjSkip = document.getElementById('btn-dj-skip');
  const btnDjStop = document.getElementById('btn-dj-stop');
  const btnDjLoop = document.getElementById('btn-dj-loop');
  const djLoopText = document.getElementById('dj-loop-text');
  const btnDjShuffle = document.getElementById('btn-dj-shuffle');
  const djVolSlider = document.getElementById('dj-vol-slider');
  const djVolText = document.getElementById('dj-vol-text');
  const djQueueBadge = document.getElementById('dj-queue-badge');
  const djQueueContainer = document.getElementById('dj-queue-container');

  let isUserSeeking = false;
  let currentDjPlayback = {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    lastSyncTimestamp: Date.now()
  };

  // Realtime smooth sub-second timeline ticker (every 250ms)
  setInterval(() => {
    if (currentDjPlayback.isPlaying && !currentDjPlayback.isPaused && !isUserSeeking) {
      const elapsed = (Date.now() - currentDjPlayback.lastSyncTimestamp) / 1000;
      const estimatedSec = Math.min(currentDjPlayback.duration, currentDjPlayback.currentTime + elapsed);
      
      if (djTimeCur) djTimeCur.textContent = formatTimeSeconds(estimatedSec);
      if (djSeekSlider && currentDjPlayback.duration > 0) {
        djSeekSlider.value = estimatedSec;
      }
    }
  }, 250);

  // Dedicated 1-second background poll for DJ Queue & Status
  setInterval(() => {
    const djTabPane = document.getElementById('tab-pane-dj');
    if (djTabPane && djTabPane.classList.contains('active')) {
      fetchDjQueue();
    }
  }, 1000);

  async function fetchDjQueue() {
    if (!currentGuildId) return;

    try {
      const res = await fetch(`/api/music/queue/${currentGuildId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.success) return;

      if (data.isPlaying && data.currentSong) {
        currentDjPlayback.isPlaying = true;
        currentDjPlayback.isPaused = Boolean(data.isPaused);
        currentDjPlayback.currentTime = Number(data.currentTime) || 0;
        currentDjPlayback.duration = Number(data.duration) || 1;
        currentDjPlayback.lastSyncTimestamp = Date.now();
        if (djTrackTitle) djTrackTitle.textContent = data.currentSong.name;
        if (djTrackArtist) djTrackArtist.textContent = `${data.currentSong.uploader} • 48kHz Stereo`;
        if (djTrackRequester) djTrackRequester.textContent = data.currentSong.requester;
        if (djCoverImg && data.currentSong.thumbnail) djCoverImg.src = data.currentSong.thumbnail;

        if (djBadgeText) djBadgeText.textContent = data.isPaused ? 'PAUSED' : 'PLAYING';
        if (djStatusBadge) {
          djStatusBadge.style.color = data.isPaused ? 'var(--accent-yellow)' : 'var(--accent-green)';
          djStatusBadge.style.background = data.isPaused ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)';
        }

        if (djCoverImg) {
          if (data.isPaused) djCoverImg.classList.add('paused');
          else djCoverImg.classList.remove('paused');
        }

        if (btnDjToggle) {
          btnDjToggle.innerHTML = data.isPaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
        }

        if (djTimeCur) djTimeCur.textContent = data.formattedCurrentTime;
        if (djTimeTotal) djTimeTotal.textContent = data.formattedDuration;

        if (!isUserSeeking && djSeekSlider && data.duration > 0) {
          djSeekSlider.max = data.duration;
          djSeekSlider.value = data.currentTime;
        }

        if (djVolSlider && djVolText) {
          djVolSlider.value = data.volume;
          djVolText.textContent = `${data.volume}%`;
        }

        if (djLoopText) {
          const loopNames = ['Off', '🔂 Song', '🔁 Queue'];
          djLoopText.textContent = loopNames[data.repeatMode] || 'Off';
        }
      } else {
        currentDjPlayback.isPlaying = false;
        currentDjPlayback.isPaused = false;
        currentDjPlayback.currentTime = 0;
        currentDjPlayback.duration = 0;
        if (djTrackTitle) djTrackTitle.textContent = 'ยังไม่มีเพลงที่กำลังเล่น';
        if (djTrackArtist) djTrackArtist.textContent = 'Uryu Music System • 48kHz Stereo';
        if (djTrackRequester) djTrackRequester.textContent = '-';
        if (djBadgeText) djBadgeText.textContent = 'STANDBY';
        if (djStatusBadge) {
          djStatusBadge.style.color = 'var(--accent-green)';
          djStatusBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        }
        if (djTimeCur) djTimeCur.textContent = '00:00';
        if (djTimeTotal) djTimeTotal.textContent = '00:00';
        if (djSeekSlider) {
          djSeekSlider.value = 0;
          djSeekSlider.max = 100;
        }
        if (btnDjToggle) btnDjToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
      }

      // Render Queue List
      if (djQueueBadge) djQueueBadge.textContent = data.queue ? data.queue.length : 0;
      if (djQueueContainer) {
        if (!data.queue || data.queue.length === 0) {
          djQueueContainer.innerHTML = `
            <div class="dj-empty-queue">
              <i class="fa-solid fa-music"></i>
              <p>ไม่มีเพลงที่กำลังรอเล่นในคิว</p>
              <span>พิมพ์ค้นหาเพลงด้านซ้ายแล้วกดเล่นเพื่อเพิ่มเข้าคิว</span>
            </div>
          `;
        } else {
          djQueueContainer.innerHTML = data.queue.map((song, idx) => `
            <div class="dj-queue-item">
              <span class="dj-q-index">#${idx + 1}</span>
              <img src="${song.thumbnail || 'https://cdn-icons-png.flaticon.com/512/1069/1069210.png'}" alt="Thumb" class="dj-q-thumb">
              <div class="dj-q-details">
                <div class="dj-q-title" title="${song.name}">${song.name}</div>
                <div class="dj-q-meta">${song.formattedDuration} • ผู้ขอ: ${song.requester}</div>
              </div>
              <button class="dj-q-del-btn" data-index="${idx + 1}" title="ลบเพลงนี้ออกจากคิว"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `).join('');

          // Bind delete buttons
          djQueueContainer.querySelectorAll('.dj-q-del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const songIndex = btn.getAttribute('data-index');
              try {
                const delRes = await fetch(`/api/music/queue/${currentGuildId}/${songIndex}`, {
                  method: 'DELETE',
                  credentials: 'include'
                });
                const delData = await delRes.json();
                if (delData.success) {
                  showToast(delData.message);
                  fetchDjQueue();
                } else {
                  showToast(delData.error, 'error');
                }
              } catch {
                showToast('ไม่สามารถลบเพลงได้', 'error');
              }
            });
          });
        }
      }
    } catch {}
  }

  // Event: DJ Direct Search & Play
  if (btnDjPlay) {
    btnDjPlay.addEventListener('click', async () => {
      const query = djSearchInput ? djSearchInput.value.trim() : '';
      const voiceChannelId = djVoiceChannel ? djVoiceChannel.value : '';

      if (!currentGuildId) return showToast('กรุณาเลือกเซิร์ฟเวอร์ก่อน', 'error');
      if (!query) return showToast('กรุณากรอกชื่อเพลงหรือลิงก์ URL', 'error');

      btnDjPlay.disabled = true;
      btnDjPlay.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังโหลด...';

      try {
        const res = await fetch('/api/music/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            guildId: currentGuildId,
            voiceChannelId,
            query
          })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          if (djSearchInput) djSearchInput.value = '';
          setTimeout(fetchDjQueue, 1500);
        } else {
          showToast(data.error, 'error');
        }
      } catch {
        showToast('ไม่สามารถเชื่อมต่อระบบเพลงได้', 'error');
      } finally {
        btnDjPlay.disabled = false;
        btnDjPlay.innerHTML = '<i class="fa-solid fa-play"></i> เล่นเพลง';
      }
    });
  }

  // Event: DJ Seeking Slider
  if (djSeekSlider) {
    djSeekSlider.addEventListener('mousedown', () => { isUserSeeking = true; });
    djSeekSlider.addEventListener('touchstart', () => { isUserSeeking = true; });
    djSeekSlider.addEventListener('input', (e) => {
      isUserSeeking = true;
      const pos = Number(e.target.value);
      if (djTimeCur) djTimeCur.textContent = formatTimeSeconds(pos);
    });
    djSeekSlider.addEventListener('change', async (e) => {
      const pos = Number(e.target.value);
      currentDjPlayback.currentTime = pos;
      currentDjPlayback.lastSyncTimestamp = Date.now();
      try {
        await fetch('/api/music/seek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId, position: pos })
        });
      } catch {}
      isUserSeeking = false;
    });
  }

  // Event: DJ Volume Slider
  if (djVolSlider) {
    djVolSlider.addEventListener('input', (e) => {
      if (djVolText) djVolText.textContent = `${e.target.value}%`;
    });
    djVolSlider.addEventListener('change', async (e) => {
      try {
        await fetch('/api/music/volume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId, volume: e.target.value })
        });
      } catch {}
    });
  }

  // Event: DJ Loop Button
  if (btnDjLoop) {
    btnDjLoop.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/music/loop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        }
      } catch {}
    });
  }

  // Event: DJ Shuffle Button
  if (btnDjShuffle) {
    btnDjShuffle.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/music/shuffle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        } else {
          showToast(data.error, 'error');
        }
      } catch {}
    });
  }

  // Event: DJ Controls (Play, Prev, Skip, Stop)
  if (btnDjToggle) {
    btnDjToggle.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        } else {
          showToast(data.error, 'error');
        }
      } catch {}
    });
  }

  if (btnDjSkip) {
    btnDjSkip.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        } else {
          showToast(data.error, 'error');
        }
      } catch {}
    });
  }

  if (btnDjPrev) {
    btnDjPrev.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-previous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        } else {
          showToast(data.error, 'error');
        }
      } catch {}
    });
  }

  if (btnDjStop) {
    btnDjStop.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/actions/music-stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ guildId: currentGuildId })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchDjQueue();
        } else {
          showToast(data.error, 'error');
        }
      } catch {}
    });
  }

  // ================= TAB 3: Interactive Embed Builder Logic =================
  const embedChannelSelect = document.getElementById('embed-channel-select');
  const embedTitle = document.getElementById('embed-title');
  const embedTitleUrl = document.getElementById('embed-title-url');
  const embedDesc = document.getElementById('embed-desc');
  const embedColor = document.getElementById('embed-color');
  const embedAuthorName = document.getElementById('embed-author-name');
  const embedAuthorIcon = document.getElementById('embed-author-icon');
  const embedAuthorUrl = document.getElementById('embed-author-url');
  const embedThumbnail = document.getElementById('embed-thumbnail');
  const embedImage = document.getElementById('embed-image');
  const embedFooterText = document.getElementById('embed-footer-text');
  const embedFooterIcon = document.getElementById('embed-footer-icon');
  const embedShowTimestamp = document.getElementById('embed-show-timestamp');
  const btnSendCustomEmbed = document.getElementById('btn-send-custom-embed');

  // Preview elements
  const previewEmbedBox = document.getElementById('preview-embed-box');
  const previewAuthorWrap = document.getElementById('preview-author-wrap');
  const previewAuthorIcon = document.getElementById('preview-author-icon');
  const previewAuthorName = document.getElementById('preview-author-name');
  const previewTitle = document.getElementById('preview-title');
  const previewDesc = document.getElementById('preview-desc');
  const previewThumbWrap = document.getElementById('preview-thumb-wrap');
  const previewThumbImg = document.getElementById('preview-thumb-img');
  const previewBannerWrap = document.getElementById('preview-banner-wrap');
  const previewBannerImg = document.getElementById('preview-banner-img');
  const previewFooterWrap = document.getElementById('preview-footer-wrap');
  const previewFooterIcon = document.getElementById('preview-footer-icon');
  const previewFooterText = document.getElementById('preview-footer-text');
  const previewFooterDot = document.getElementById('preview-footer-dot');
  const previewTimestamp = document.getElementById('preview-timestamp');

  function updateEmbedPreview() {
    const color = embedColor ? embedColor.value : '#00f0ff';
    if (previewEmbedBox) previewEmbedBox.style.borderLeftColor = color;

    // Author
    const aName = embedAuthorName ? embedAuthorName.value.trim() : '';
    const aIcon = embedAuthorIcon ? embedAuthorIcon.value.trim() : '';
    if (previewAuthorWrap) {
      if (aName) {
        previewAuthorWrap.style.display = 'flex';
        if (previewAuthorName) previewAuthorName.textContent = aName;
        if (previewAuthorIcon) {
          if (aIcon) {
            previewAuthorIcon.src = aIcon;
            previewAuthorIcon.style.display = 'block';
          } else {
            previewAuthorIcon.style.display = 'none';
          }
        }
      } else {
        previewAuthorWrap.style.display = 'none';
      }
    }

    // Title
    const title = embedTitle ? embedTitle.value.trim() : '';
    if (previewTitle) {
      if (title) {
        previewTitle.style.display = 'block';
        previewTitle.textContent = title;
      } else {
        previewTitle.style.display = 'none';
      }
    }

    // Description
    const desc = embedDesc ? embedDesc.value : '';
    if (previewDesc) {
      previewDesc.textContent = desc || 'พิมพ์ข้อความฝั่งซ้ายเพื่อดูตัวอย่างแบบสดๆ ได้ที่นี่...';
    }

    // Thumbnail
    const thumb = embedThumbnail ? embedThumbnail.value.trim() : '';
    if (previewThumbWrap && previewThumbImg) {
      if (thumb && thumb.startsWith('http')) {
        previewThumbImg.src = thumb;
        previewThumbWrap.style.display = 'block';
      } else {
        previewThumbWrap.style.display = 'none';
      }
    }

    // Banner Image
    const banner = embedImage ? embedImage.value.trim() : '';
    if (previewBannerWrap && previewBannerImg) {
      if (banner && banner.startsWith('http')) {
        previewBannerImg.src = banner;
        previewBannerWrap.style.display = 'block';
      } else {
        previewBannerWrap.style.display = 'none';
      }
    }

    // Footer & Timestamp
    const fText = embedFooterText ? embedFooterText.value.trim() : '';
    const fIcon = embedFooterIcon ? embedFooterIcon.value.trim() : '';
    const hasTime = embedShowTimestamp ? embedShowTimestamp.checked : true;

    if (previewFooterText) previewFooterText.textContent = fText || (hasTime ? '' : 'UryuBot Live Embed Suite');
    if (previewFooterIcon) {
      if (fIcon && fIcon.startsWith('http')) {
        previewFooterIcon.src = fIcon;
        previewFooterIcon.style.display = 'block';
      } else {
        previewFooterIcon.style.display = 'none';
      }
    }
    if (previewFooterDot) previewFooterDot.style.display = (fText && hasTime) ? 'inline' : 'none';
    if (previewTimestamp) {
      previewTimestamp.style.display = hasTime ? 'inline' : 'none';
      previewTimestamp.textContent = `วันนี้ เวลา ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  // Bind live typing events
  const embedInputFields = [embedTitle, embedTitleUrl, embedDesc, embedColor, embedAuthorName, embedAuthorIcon, embedAuthorUrl, embedThumbnail, embedImage, embedFooterText, embedFooterIcon, embedShowTimestamp];
  embedInputFields.forEach(field => {
    if (field) {
      field.addEventListener('input', updateEmbedPreview);
      field.addEventListener('change', updateEmbedPreview);
    }
  });

  // Color preset buttons
  document.querySelectorAll('.color-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (embedColor) embedColor.value = color;
      updateEmbedPreview();
    });
  });

  // Send Custom Embed Action
  if (btnSendCustomEmbed) {
    btnSendCustomEmbed.addEventListener('click', async () => {
      const channelId = embedChannelSelect ? embedChannelSelect.value : '';
      if (!currentGuildId) return showToast('กรุณาเลือกเซิร์ฟเวอร์ก่อน', 'error');
      if (!channelId) return showToast('กรุณาเลือกช่องแชทที่ต้องการส่ง', 'error');

      const title = embedTitle ? embedTitle.value.trim() : '';
      const description = embedDesc ? embedDesc.value.trim() : '';

      if (!title && !description) {
        return showToast('กรุณาระบุหัวข้อหรือเนื้อหาประกาศ', 'error');
      }

      btnSendCustomEmbed.disabled = true;
      btnSendCustomEmbed.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังส่งประกาศ...';

      const payload = {
        guildId: currentGuildId,
        channelId,
        title,
        titleUrl: embedTitleUrl ? embedTitleUrl.value.trim() : '',
        description,
        color: embedColor ? embedColor.value : '#00f0ff',
        authorName: embedAuthorName ? embedAuthorName.value.trim() : '',
        authorIcon: embedAuthorIcon ? embedAuthorIcon.value.trim() : '',
        authorUrl: embedAuthorUrl ? embedAuthorUrl.value.trim() : '',
        thumbnail: embedThumbnail ? embedThumbnail.value.trim() : '',
        image: embedImage ? embedImage.value.trim() : '',
        footerText: embedFooterText ? embedFooterText.value.trim() : '',
        footerIcon: embedFooterIcon ? embedFooterIcon.value.trim() : '',
        showTimestamp: embedShowTimestamp ? embedShowTimestamp.checked : true
      };

      try {
        const res = await fetch('/api/embeds/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message);
        } else {
          showToast(data.error, 'error');
        }
      } catch {
        showToast('ไม่สามารถส่งประกาศได้', 'error');
      } finally {
        btnSendCustomEmbed.disabled = false;
        btnSendCustomEmbed.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งประกาศ Embed เข้า Discord ทันที';
      }
    });
  }

  // ================= TAB 4: Quick Moderation & Live Logs Logic =================
  const modSearchInput = document.getElementById('mod-search-input');
  const modMembersTbody = document.getElementById('mod-members-tbody');
  const modAuditFeed = document.getElementById('mod-audit-feed');

  // Modal elements
  const modActionModal = document.getElementById('mod-action-modal');
  const modModalTitle = document.getElementById('mod-modal-title');
  const modModalAvatar = document.getElementById('mod-modal-avatar');
  const modModalName = document.getElementById('mod-modal-name');
  const modModalId = document.getElementById('mod-modal-id');
  const modDurationGroup = document.getElementById('mod-duration-group');
  const modModalDuration = document.getElementById('mod-modal-duration');
  const modDeleteMsgGroup = document.getElementById('mod-delete-msg-group');
  const modModalDelMsg = document.getElementById('mod-modal-del-msg');
  const modModalReason = document.getElementById('mod-modal-reason');
  const btnCloseModModal = document.getElementById('btn-close-mod-modal');
  const btnCancelModModal = document.getElementById('btn-cancel-mod-modal');
  const btnConfirmModModal = document.getElementById('btn-confirm-mod-modal');

  let currentModTarget = null;
  let currentModAction = '';
  let cachedMembers = [];

  async function fetchGuildMembers() {
    if (!currentGuildId || !modMembersTbody) return;

    modMembersTbody.innerHTML = `<tr><td colspan="4" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังดึงรายชื่อสมาชิก...</td></tr>`;

    try {
      const res = await fetch(`/api/guilds/${currentGuildId}/members`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.members) {
        cachedMembers = data.members;
        renderGuildMembers();
      }
    } catch {
      modMembersTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--accent-red);">ไม่สามารถโหลดสมาชิกได้</td></tr>`;
    }
  }

  function renderGuildMembers() {
    if (!modMembersTbody) return;
    const query = modSearchInput ? modSearchInput.value.toLowerCase().trim() : '';

    const filtered = cachedMembers.filter(m => 
      m.username.toLowerCase().includes(query) ||
      m.displayName.toLowerCase().includes(query) ||
      m.id.includes(query)
    );

    if (filtered.length === 0) {
      modMembersTbody.innerHTML = `<tr><td colspan="4" class="text-center">ไม่พบสมาชิกที่ตรงกับ "${query}"</td></tr>`;
      return;
    }

    modMembersTbody.innerHTML = filtered.map(m => `
      <tr>
        <td>
          <div class="mod-member-cell">
            <img src="${m.avatar}" alt="Avatar" class="mod-member-avatar">
            <div>
              <strong>${m.displayName}</strong>
              <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">${m.tag}</div>
            </div>
          </div>
        </td>
        <td>
          ${m.roles.map(r => `<span class="mod-role-badge" style="border-left: 2px solid ${r.color || '#fff'}">${r.name}</span>`).join('') || '<span style="color: var(--text-dim); font-size: 11px;">ไม่มียศ</span>'}
        </td>
        <td>
          ${m.isOwner ? '<span style="color: var(--accent-yellow); font-weight: 700; font-size: 11px;">👑 OWNER</span>' : m.isTimedOut ? '<span style="color: var(--accent-red); font-size: 11px;">⏳ TIMED OUT</span>' : '<span style="color: var(--accent-green); font-size: 11px;">ACTIVE</span>'}
        </td>
        <td>
          ${!m.isOwner ? `
            <div class="mod-action-btns">
              <button class="mod-act-btn kick" data-id="${m.id}" data-name="${m.displayName}" data-avatar="${m.avatar}" title="เตะสมาชิก"><i class="fa-solid fa-user-xmark"></i> เตะ</button>
              <button class="mod-act-btn ban" data-id="${m.id}" data-name="${m.displayName}" data-avatar="${m.avatar}" title="แบนสมาชิก"><i class="fa-solid fa-gavel"></i> แบน</button>
              ${m.isTimedOut 
                ? `<button class="mod-act-btn mute" data-id="${m.id}" data-name="${m.displayName}" data-avatar="${m.avatar}" data-unmute="true" title="ยกเลิก Timeout"><i class="fa-solid fa-volume-high"></i> ปลดแชท</button>`
                : `<button class="mod-act-btn mute" data-id="${m.id}" data-name="${m.displayName}" data-avatar="${m.avatar}" title="ปิดการใช้งานแชท"><i class="fa-solid fa-volume-xmark"></i> ปิดแชท</button>`}
            </div>
          ` : '<span style="color: var(--text-dim); font-size: 11px;">-</span>'}
        </td>
      </tr>
    `).join('');

    // Bind action buttons
    modMembersTbody.querySelectorAll('.mod-act-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-id');
        const targetName = btn.getAttribute('data-name');
        const targetAvatar = btn.getAttribute('data-avatar');
        const isUnmute = btn.getAttribute('data-unmute') === 'true';

        currentModTarget = { id: targetId, name: targetName, avatar: targetAvatar };

        if (btn.classList.contains('kick')) {
          openModModal('kick', '👢 เตะสมาชิกออกจากเซิร์ฟเวอร์');
        } else if (btn.classList.contains('ban')) {
          openModModal('ban', '🔨 แบนสมาชิกออกจากเซิร์ฟเวอร์');
        } else if (btn.classList.contains('mute')) {
          if (isUnmute) openModModal('untimeout', '🔊 ยกเลิกการปิดแชทสมาชิก');
          else openModModal('timeout', '⏳ ปิดการใช้งานแชทชั่วคราว (Timeout)');
        }
      });
    });
  }

  if (modSearchInput) {
    modSearchInput.addEventListener('input', renderGuildMembers);
  }

  function openModModal(action, title) {
    if (!currentModTarget || !modActionModal) return;
    currentModAction = action;

    if (modModalTitle) modModalTitle.innerHTML = `<i class="fa-solid fa-gavel"></i> ${title}`;
    if (modModalAvatar) modModalAvatar.src = currentModTarget.avatar;
    if (modModalName) modModalName.textContent = currentModTarget.name;
    if (modModalId) modModalId.textContent = `ID: ${currentModTarget.id}`;
    if (modModalReason) modModalReason.value = '';

    if (modDurationGroup) modDurationGroup.style.display = action === 'timeout' ? 'block' : 'none';
    if (modDeleteMsgGroup) modDeleteMsgGroup.style.display = action === 'ban' ? 'block' : 'none';

    modActionModal.style.display = 'flex';
  }

  function closeModModal() {
    if (modActionModal) modActionModal.style.display = 'none';
    currentModTarget = null;
    currentModAction = '';
  }

  if (btnCloseModModal) btnCloseModModal.addEventListener('click', closeModModal);
  if (btnCancelModModal) btnCancelModModal.addEventListener('click', closeModModal);

  if (btnConfirmModModal) {
    btnConfirmModModal.addEventListener('click', async () => {
      if (!currentModTarget || !currentModAction || !currentGuildId) return;

      btnConfirmModModal.disabled = true;
      btnConfirmModModal.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังดำเนินการ...';

      const payload = {
        guildId: currentGuildId,
        action: currentModAction,
        targetUserId: currentModTarget.id,
        reason: modModalReason ? modModalReason.value.trim() : '',
        durationMs: modModalDuration ? modModalDuration.value : '300000',
        deleteMessages: modModalDelMsg ? modModalDelMsg.value : '0'
      };

      try {
        const res = await fetch('/api/moderation/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          closeModModal();
          fetchGuildMembers();
          fetchGuildAuditLogs();
        } else {
          showToast(data.error, 'error');
        }
      } catch {
        showToast('เกิดข้อผิดพลาดในการทำรายการ', 'error');
      } finally {
        btnConfirmModModal.disabled = false;
        btnConfirmModModal.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการดำเนินการ';
      }
    });
  }

  async function fetchGuildAuditLogs() {
    if (!currentGuildId || !modAuditFeed) return;

    try {
      const res = await fetch(`/api/guilds/${currentGuildId}/audit-logs`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.entries) {
        if (data.entries.length === 0) {
          modAuditFeed.innerHTML = '<div class="empty-log-msg">ไม่มีประวัติ Audit Logs ในช่วงนี้</div>';
          return;
        }

        modAuditFeed.innerHTML = data.entries.map(log => `
          <div class="mod-log-item">
            <div class="mod-log-top">
              <span><i class="fa-solid fa-user-shield"></i> ${log.executor ? log.executor.tag : 'System'}</span>
              <span>${new Date(log.createdTimestamp).toLocaleTimeString()}</span>
            </div>
            <div>
              <span class="mod-log-target">${log.actionName}</span> ➔ ${log.target ? log.target.tag : '-'}
            </div>
            <div class="mod-log-reason">เหตุผล: ${log.reason}</div>
          </div>
        `).join('');
      }
    } catch {}
  }

    // Populate options helper for DJ and Embed
  async function updateStudioChannelDropdowns(guild) {
    if (!guild) return;

    let channels = guild.channels || [];

    // Fallback: If channels are missing or voice channels not present, fetch from direct API
    const hasVoice = channels.some(c => c.isVoice || c.type === 2 || c.type === 13);
    if (!hasVoice && guild.id) {
      try {
        const cRes = await fetch(`/api/guilds/${guild.id}/channels`);
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.success && cData.channels) {
            channels = cData.channels;
            guild.channels = channels;
          }
        }
      } catch {}
    }

    // Populate Voice Channels for DJ Studio
    if (djVoiceChannel) {
      djVoiceChannel.innerHTML = '<option value="">เลือกห้องเสียง...</option>';
      const voiceChannels = channels.filter(c => c.isVoice || c.type === 2 || c.type === 13);
      if (voiceChannels.length > 0) {
        voiceChannels.forEach(ch => {
          const opt = document.createElement('option');
          opt.value = ch.id;
          opt.textContent = `🔊 ${ch.name}`;
          djVoiceChannel.appendChild(opt);
        });
      } else {
        djVoiceChannel.innerHTML = '<option value="">ไม่พบห้องเสียงในเซิร์ฟเวอร์</option>';
      }
    }

    // Populate Text Channels for Embed Builder
    if (embedChannelSelect) {
      embedChannelSelect.innerHTML = '<option value="">เลือกห้องแชท...</option>';
      const textChannels = channels.filter(c => c.isText || c.type === 0 || c.type === 5);
      textChannels.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `# ${ch.name}`;
        embedChannelSelect.appendChild(opt);
      });
    }
  }

  // Hook into guild select event to update dropdowns
  


  // เริ่มต้นทำงาน
  checkUrlErrors();
  checkAuthStatus();
  fetchLiveStats();
  fetchCommands();

  // Polling สถิติสดและสถานะเพลงแบบ Realtime ทุกๆ 1.5 วินาที
  setInterval(fetchLiveStats, 1500);
});
