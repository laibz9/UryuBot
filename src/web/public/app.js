/**
 * @file src/web/public/app.js
 * @description Script จัดการ Web Setup Dashboard, Discord OAuth2 Login, Realtime Polling, และ SQLite Sync
 */

document.addEventListener('DOMContentLoaded', () => {
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

  const cfgVerifyChannel = document.getElementById('cfg-verify-channel');
  const cfgWelcomeChannel = document.getElementById('cfg-welcome-channel');
  const cfgGoodbyeChannel = document.getElementById('cfg-goodbye-channel');
  const cfgLogChannel = document.getElementById('cfg-log-channel');
  const cfgMusicChannel = document.getElementById('cfg-music-channel');
  const cfgTicketCategory = document.getElementById('cfg-ticket-category');

  const cfgEnableWelcome = document.getElementById('cfg-enable-welcome');
  const cfgEnableLogs = document.getElementById('cfg-enable-logs');
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
      const res = await fetch('/api/auth/user');
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

        // 2. ตรวจสอบสิทธิ์ว่ามีเซิร์ฟเวอร์ที่เป็นเจ้าของหรือไม่
        if (data.isOwnerOfAny) {
          dashboardLockOverlay.style.display = 'none';
          dashboardContent.style.display = 'block';

          ownerAvatarImg.src = currentUser.avatar;
          ownerNameDisplay.textContent = currentUser.global_name || currentUser.username;

          await fetchGuilds();
        } else {
          // ล็อกอินแล้วแต่ไม่ใช่เจ้าของเซิร์ฟเวอร์ใดเลย
          dashboardLockOverlay.style.display = 'block';
          dashboardContent.style.display = 'none';
          lockMessage.innerHTML = `⚠️ บัญชี Discord ของคุณ (<strong>${currentUser.username}</strong>) ไม่ได้เป็นเจ้าของเซิร์ฟเวอร์ใดๆ ที่บอทประจำการอยู่ กรุณาเข้าสู่ระบบด้วยบัญชีที่เป็น <strong>Server Owner</strong> ครับ`;
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

  /**
   * ดึงข้อมูลสถิติสดและสถานะเพลงจาก REST API (/api/stats)
   */
  async function fetchLiveStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        if (data.bot) {
          if (data.bot.avatar) {
            navBotAvatar.src = data.bot.avatar;
            heroBotAvatar.src = data.bot.avatar;
          }
          if (data.bot.name) botNameDisplay.textContent = data.bot.name;
          if (data.bot.tag) botTagDisplay.textContent = data.bot.tag;
          if (data.bot.inviteUrl) {
            btnInvite.href = data.bot.inviteUrl;
            btnHeroInvite.href = data.bot.inviteUrl;
          }
        }

        if (data.stats) {
          statGuilds.textContent = data.stats.guildCount.toLocaleString();
          statMembers.textContent = data.stats.totalMembers.toLocaleString();
          statPing.textContent = `${data.stats.ping} ms`;
          pingValue.textContent = `${data.stats.ping} ms`;
          statUptime.textContent = data.stats.uptimeFormatted;
        }

        if (data.music) {
          const m = data.music;
          if (m.isPlaying) {
            musicCover.src = m.thumbnail;
            musicBadgeText.textContent = m.isPaused ? 'Paused' : 'Playing Now';
            musicGuildName.textContent = m.guildName;
            musicSongName.textContent = m.songName;
            musicArtistName.textContent = `${m.artist} • ${m.queueCount || 1} เพลงในคิว`;
            musicCurrentTime.textContent = m.currentTime;
            musicDuration.textContent = m.duration;
            musicProgressFill.style.width = `${m.progressPercent}%`;

            if (!m.isPaused) {
              visualizer.classList.add('active');
              musicPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
              visualizer.classList.remove('active');
              musicPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
          } else {
            musicBadgeText.textContent = 'Standby';
            musicGuildName.textContent = 'Discord Lounge';
            musicSongName.textContent = 'ยังไม่มีเพลงที่กำลังเล่น';
            musicArtistName.textContent = 'Uryu Music System • 48kHz Stereo';
            musicCurrentTime.textContent = '00:00';
            musicDuration.textContent = '00:00';
            musicProgressFill.style.width = '0%';
            visualizer.classList.remove('active');
            musicPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          }
        }
      }
    } catch (err) {
      console.warn('ไม่สามารถเชื่อมต่อ API /api/stats ได้ชั่วคราว:', err);
    }
  }

  /**
   * ดึงรายชื่อเซิร์ฟเวอร์ที่ User เป็นเจ้าของ (/api/guilds)
   */
  async function fetchGuilds() {
    try {
      const res = await fetch('/api/guilds');
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.guilds && data.guilds.length > 0) {
        allGuilds = data.guilds;
        
        guildSelector.innerHTML = allGuilds.map(g => `
          <option value="${g.id}">🏰 ${g.name} (${g.memberCount.toLocaleString()} สมาชิก)</option>
        `).join('');

        currentGuildId = allGuilds[0].id;
        populateGuildOptions(allGuilds[0]);
        await loadGuildSettings(currentGuildId);
      } else {
        guildSelector.innerHTML = '<option value="">ไม่พบเซิร์ฟเวอร์ที่คุณเป็นเจ้าของ</option>';
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

    const roleOptions = [
      '<option value="">-- ไม่กำหนดยศ (None) --</option>',
      ...guild.roles.map(r => `<option value="${r.id}">🛡️ ${r.name}</option>`)
    ].join('');

    cfgVerifiedRole.innerHTML = roleOptions;
    cfgLeaderRole.innerHTML = roleOptions;
    cfgAdminRole.innerHTML = roleOptions;
    cfgModeratorRole.innerHTML = roleOptions;

    const textChannels = guild.channels.filter(c => c.type !== 4);
    const channelOptions = [
      '<option value="">-- ไม่กำหนดช่อง (None) --</option>',
      ...textChannels.map(c => `<option value="${c.id}"># ${c.name}</option>`)
    ].join('');

    cfgVerifyChannel.innerHTML = channelOptions;
    cfgWelcomeChannel.innerHTML = channelOptions;
    cfgGoodbyeChannel.innerHTML = channelOptions;
    cfgLogChannel.innerHTML = channelOptions;
    cfgMusicChannel.innerHTML = channelOptions;
    annChannel.innerHTML = channelOptions;

    const categoryChannels = guild.channels.filter(c => c.type === 4);
    const categoryOptions = [
      '<option value="">-- ไม่กำหนดหมวดหมู่ (None) --</option>',
      ...categoryChannels.map(c => `<option value="${c.id}">📁 ${c.name}</option>`),
      ...textChannels.map(c => `<option value="${c.id}"># ${c.name}</option>`)
    ].join('');

    cfgTicketCategory.innerHTML = categoryOptions;
  }

  /**
   * ดึงการตั้งค่าของเซิร์ฟเวอร์จาก SQLite (/api/settings/:guildId)
   */
  async function loadGuildSettings(guildId) {
    try {
      const res = await fetch(`/api/settings/${guildId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.settings) {
        const s = data.settings;
        if (s.verifiedRoleId) cfgVerifiedRole.value = s.verifiedRoleId;
        if (s.leaderRoleId) cfgLeaderRole.value = s.leaderRoleId;
        if (s.adminRoleId) cfgAdminRole.value = s.adminRoleId;
        if (s.moderatorRoleId) cfgModeratorRole.value = s.moderatorRoleId;

        if (s.verifyChannelId) cfgVerifyChannel.value = s.verifyChannelId;
        if (s.welcomeChannelId) cfgWelcomeChannel.value = s.welcomeChannelId;
        if (s.goodbyeChannelId) cfgGoodbyeChannel.value = s.goodbyeChannelId;
        if (s.logChannelId) cfgLogChannel.value = s.logChannelId;
        if (s.musicChannelId) cfgMusicChannel.value = s.musicChannelId;
        if (s.ticketCategoryId) cfgTicketCategory.value = s.ticketCategoryId;

        cfgEnableWelcome.checked = Boolean(s.enableWelcomeSystem);
        cfgEnableLogs.checked = Boolean(s.enableLogSystem);

        saveStatus.textContent = `อัปเดตล่าสุด: ${s.updatedAt || 'ค่าเริ่มต้น'}`;
      }
    } catch (err) {
      console.error('ไม่สามารถโหลดการตั้งค่าได้:', err);
    }
  }

  // Event: เปลี่ยนเซิร์ฟเวอร์ที่เลือก
  guildSelector.addEventListener('change', async (e) => {
    currentGuildId = e.target.value;
    const selectedGuild = allGuilds.find(g => g.id === currentGuildId);
    if (selectedGuild) {
      populateGuildOptions(selectedGuild);
      await loadGuildSettings(currentGuildId);
      showToast(`เปลี่ยนเซิร์ฟเวอร์เป็น: ${selectedGuild.name}`);
    }
  });

  // Event: บันทึกการตั้งค่าลงฐานข้อมูล SQLite
  btnSaveSettings.addEventListener('click', async () => {
    if (!currentGuildId) {
      showToast('กรุณาเลือกเซิร์ฟเวอร์ก่อน', 'error');
      return;
    }

    btnSaveSettings.disabled = true;
    btnSaveSettings.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึกลง SQLite...';

    const payload = {
      verifiedRoleId: cfgVerifiedRole.value,
      leaderRoleId: cfgLeaderRole.value,
      adminRoleId: cfgAdminRole.value,
      moderatorRoleId: cfgModeratorRole.value,
      verifyChannelId: cfgVerifyChannel.value,
      welcomeChannelId: cfgWelcomeChannel.value,
      goodbyeChannelId: cfgGoodbyeChannel.value,
      logChannelId: cfgLogChannel.value,
      musicChannelId: cfgMusicChannel.value,
      ticketCategoryId: cfgTicketCategory.value,
      enableWelcomeSystem: cfgEnableWelcome.checked,
      enableLogSystem: cfgEnableLogs.checked
    };

    try {
      const res = await fetch(`/api/settings/${currentGuildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('บันทึกการตั้งค่าลงฐานข้อมูล SQLite เรียบร้อยแล้ว! ✅');
        saveStatus.textContent = `บันทึกแล้วเมื่อ ${new Date().toLocaleTimeString()}`;
      } else {
        showToast(`เกิดข้อผิดพลาด: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      btnSaveSettings.disabled = false;
      btnSaveSettings.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่าลง SQLite';
    }
  });

  // Remote Action: ส่งแผงยืนยันตัวตน
  btnActionVerify.addEventListener('click', async () => {
    const channelId = cfgVerifyChannel.value || cfgWelcomeChannel.value || cfgLogChannel.value;
    if (!channelId) {
      showToast('กรุณาเลือกช่องในส่วนการตั้งค่าก่อน', 'error');
      return;
    }

    try {
      const res = await fetch('/api/actions/send-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId, channelId })
      });
      const data = await res.json();
      if (data.success) showToast(data.message);
      else showToast(data.error, 'error');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการส่ง', 'error');
    }
  });

  // Remote Action: ส่งแผงเปิดทิกเก็ต
  btnActionTicket.addEventListener('click', async () => {
    const channelId = cfgLogChannel.value || cfgWelcomeChannel.value;
    if (!channelId) {
      showToast('กรุณาเลือกช่องสำหรับส่งทิกเก็ตก่อน', 'error');
      return;
    }

    try {
      const res = await fetch('/api/actions/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId, channelId })
      });
      const data = await res.json();
      if (data.success) showToast(data.message);
      else showToast(data.error, 'error');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการส่ง', 'error');
    }
  });

  // Remote Action: ติดตั้งห้องขอเพลง
  btnActionMusic.addEventListener('click', async () => {
    const channelId = cfgMusicChannel.value;
    if (!channelId) {
      showToast('กรุณาเลือกช่องขอเพลงก่อน', 'error');
      return;
    }

    try {
      const res = await fetch('/api/actions/setup-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: currentGuildId, channelId })
      });
      const data = await res.json();
      if (data.success) showToast(data.message);
      else showToast(data.error, 'error');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการติดตั้ง', 'error');
    }
  });

  // Remote Action: ล็อกดาวน์ฉุกเฉิน
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

  // Remote Action: ส่งประกาศข่าวสาร
  btnSendAnnouncement.addEventListener('click', async () => {
    const channelId = annChannel.value;
    const title = annTitle.value.trim();
    const description = annDesc.value.trim();

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
          color: annColor.value,
          image: annImage.value.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('ส่งประกาศเข้าเซิร์ฟเวอร์เรียบร้อยแล้ว! 📢');
        annTitle.value = '';
        annDesc.value = '';
        annImage.value = '';
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

  /**
   * ดึงรายชื่อคำสั่งทั้งหมดจาก API (/api/commands)
   */
  async function fetchCommands() {
    try {
      const res = await fetch('/api/commands');
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.commands) {
        allCommands = data.commands;
        renderCommands();
      }
    } catch (err) {
      commandsContainer.innerHTML = `
        <div class="loading-spinner" style="color: var(--accent-red);">
          <i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถโหลดรายการคำสั่งได้
        </div>
      `;
    }
  }

  /**
   * แสดงผลการ์ดคำสั่งตามเงื่อนไขการค้นหาและหมวดหมู่
   */
  function renderCommands() {
    const query = cmdSearchInput.value.toLowerCase().trim();

    const filtered = allCommands.filter(cmd => {
      const matchCategory = (currentCategory === 'all' || cmd.category === currentCategory);
      const matchQuery = (
        cmd.name.toLowerCase().includes(query) ||
        cmd.desc.toLowerCase().includes(query) ||
        cmd.perm.toLowerCase().includes(query)
      );
      return matchCategory && matchQuery;
    });

    if (filtered.length === 0) {
      commandsContainer.innerHTML = `
        <div class="loading-spinner">
          <i class="fa-solid fa-folder-open"></i> ไม่พบคำสั่งที่ตรงกับ "${query}"
        </div>
      `;
      return;
    }

    commandsContainer.innerHTML = filtered.map(cmd => `
      <div class="command-card glass-panel">
        <div class="command-header">
          <span class="cmd-name">${cmd.name}</span>
          <span class="cmd-perm">${cmd.perm}</span>
        </div>
        <p class="cmd-desc">${cmd.desc}</p>
      </div>
    `).join('');
  }

  // Event Listeners สำหรับตัวกรองหมวดหมู่
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderCommands();
    });
  });

  // Event Listener สำหรับช่องค้นหาคำสั่ง
  cmdSearchInput.addEventListener('input', () => {
    renderCommands();
  });

  // เริ่มต้นทำงาน
  checkUrlErrors();
  checkAuthStatus();
  fetchLiveStats();
  fetchCommands();

  // Polling สถิติสดทุกๆ 4 วินาที
  setInterval(fetchLiveStats, 4000);
});
