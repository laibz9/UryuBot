/**
 * @file src/database/db.js
 * @description ตัวจัดการฐานข้อมูล MySQL (mysql2/promise) พร้อม In-Memory Cache และ Fail-Safe ป้องกัน Error
 */

const mysql = require('mysql2/promise');
const config = require('../config/config');
const logger = require('../utils/logger');

// ตัวแปร Pool และ Cache ในหน่วยความจำเพื่อความเร็ว 0ms
let pool = null;
let isConnected = false;
const settingsCache = new Map();

/**
 * แปลงข้อมูลจาก DB Row ให้อยู่ในรูปแบบ Settings Object มาตรฐาน
 */
function formatSettings(guildId, row = null) {
  if (!row) {
    return {
      guildId,
      verifiedRoleId: '',
      leaderRoleId: '',
      adminRoleId: '',
      moderatorRoleId: '',
      supportRoleId: '',
      verifyChannelId: '',
      welcomeChannelId: '',
      goodbyeChannelId: '',
      enableWelcomeSystem: true,
      logChannelId: '',
      enableLogSystem: true,
      enableAdminCommands: true,
      enableModerationCommands: true,
      ticketChannelId: '',
      ticketCategoryId: '',
      musicChannelId: '',
      updatedAt: new Date().toISOString()
    };
  }

  return {
    guildId: row.guild_id,
    verifiedRoleId: row.verified_role_id || '',
    leaderRoleId: row.leader_role_id || '',
    adminRoleId: row.admin_role_id || '',
    moderatorRoleId: row.moderator_role_id || '',
    supportRoleId: row.support_role_id || '',
    verifyChannelId: row.verify_channel_id || '',
    welcomeChannelId: row.welcome_channel_id || '',
    goodbyeChannelId: row.goodbye_channel_id || '',
    enableWelcomeSystem: row.enable_welcome === 1 || row.enable_welcome === true || row.enable_welcome === '1',
    logChannelId: row.log_channel_id || '',
    enableLogSystem: row.enable_logs === 1 || row.enable_logs === true || row.enable_logs === '1',
    enableAdminCommands: row.enable_admin_commands === 1 || row.enable_admin_commands === true || row.enable_admin_commands === '1' || row.enable_admin_commands === undefined,
    enableModerationCommands: row.enable_moderation_commands === 1 || row.enable_moderation_commands === true || row.enable_moderation_commands === '1' || row.enable_moderation_commands === undefined,
    ticketChannelId: row.ticket_channel_id || '',
    ticketCategoryId: row.ticket_category_id || '',
    musicChannelId: row.music_channel_id || '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

/**
 * เริ่มต้นเชื่อมต่อฐานข้อมูล MySQL และสร้างตารางอัตโนมัติ
 */
async function initDatabase() {
  try {
    const dbConfig = config.db;
    logger.info(`[MySQL] กำลังเชื่อมต่อไปยัง ${dbConfig.host}:${dbConfig.port}...`);

    // 1. เชื่อมต่อเซิร์ฟเวอร์ MySQL เพื่อสร้าง Database หากยังไม่มี
    const tempConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 5000
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // 2. สร้าง Connection Pool พร้อมระบุ Database
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: dbConfig.waitForConnections,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit,
      charset: 'utf8mb4'
    });

    // 3. สร้างตาราง guild_settings หากยังไม่มี
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(32) NOT NULL PRIMARY KEY,
        verified_role_id VARCHAR(32) DEFAULT NULL,
        leader_role_id VARCHAR(32) DEFAULT NULL,
        admin_role_id VARCHAR(32) DEFAULT NULL,
        moderator_role_id VARCHAR(32) DEFAULT NULL,
        support_role_id VARCHAR(32) DEFAULT NULL,
        verify_channel_id VARCHAR(32) DEFAULT NULL,
        welcome_channel_id VARCHAR(32) DEFAULT NULL,
        goodbye_channel_id VARCHAR(32) DEFAULT NULL,
        enable_welcome TINYINT(1) DEFAULT 1,
        log_channel_id VARCHAR(32) DEFAULT NULL,
        enable_logs TINYINT(1) DEFAULT 1,
        enable_admin_commands TINYINT(1) DEFAULT 1,
        enable_moderation_commands TINYINT(1) DEFAULT 1,
        ticket_channel_id VARCHAR(32) DEFAULT NULL,
        ticket_category_id VARCHAR(32) DEFAULT NULL,
        ticket_counter INT DEFAULT 0,
        music_channel_id VARCHAR(32) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ตรวจสอบและเพิ่มคอลัมน์ใหม่ (Auto Migration)
    try {
      await pool.query(`ALTER TABLE guild_settings ADD COLUMN enable_admin_commands TINYINT(1) DEFAULT 1`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE guild_settings ADD COLUMN enable_moderation_commands TINYINT(1) DEFAULT 1`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE guild_settings ADD COLUMN ticket_channel_id VARCHAR(32) DEFAULT NULL`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE guild_settings ADD COLUMN ticket_counter INT DEFAULT 0`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE guild_settings ADD COLUMN support_role_id VARCHAR(32) DEFAULT NULL`);
    } catch {}

    // 4. โหลดข้อมูลทั้งหมดขึ้น In-Memory Cache
    const [rows] = await pool.query('SELECT * FROM guild_settings');
    for (const row of rows) {
      settingsCache.set(row.guild_id, formatSettings(row.guild_id, row));
    }

    isConnected = true;
    logger.success(`==============================================`);
    logger.success(`🐬 [MySQL] เชื่อมต่อฐานข้อมูล "${dbConfig.database}" สำเร็จ!`);
    logger.success(`🐬 [MySQL] โหลด ${rows.length} เซิร์ฟเวอร์ขึ้น In-Memory Cache เรียบร้อย`);
    logger.success(`==============================================`);
  } catch (error) {
    isConnected = false;
    logger.warn(`==============================================`);
    logger.warn(`⚠️ [MySQL Warning] ไม่สามารถเข้าถึงฐานข้อมูล MySQL ได้`);
    logger.warn(`🔍 สาเหตุ: ${error.code || error.message}`);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.warn(`💡 วิธีแก้: ตรวจพบ Service MySQL80 ในเครื่อง แต่รหัสผ่าน 'root' ไม่ถูกต้อง กรุณาใส่ DB_PASSWORD= ในไฟล์ .env`);
    } else if (error.code === 'ECONNREFUSED') {
      logger.warn(`💡 วิธีแก้: กรุณา Start Service MySQL (XAMPP / Laragon / MySQL Service) ที่พอร์ต ${config.db.port}`);
    }
    logger.warn(`🛡️ บอทจะทำงานในโหมด Fail-Safe (In-Memory + .env) ป้องกันบอทดับ`);
    logger.warn(`==============================================`);
  }
}

/**
 * ดึงการตั้งค่าของเซิร์ฟเวอร์ (ดึงจาก Cache ทันที 0ms)
 * @param {string} guildId - Discord Guild ID
 * @returns {object} การตั้งค่าเซิร์ฟเวอร์
 */
/**
 * ดึงการตั้งค่าของเซิร์ฟเวอร์โดยตรงจาก MySQL แบบ Realtime และอัปเดต Cache
 */
async function fetchGuildSettingsFresh(guildId) {
  if (!guildId) return formatSettings('default');

  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId]);
      if (rows && rows.length > 0) {
        const fresh = formatSettings(guildId, rows[0]);
        settingsCache.set(guildId, fresh);
        return fresh;
      }
    } catch (err) {
      logger.error(`[MySQL Fetch Error]: ${err.message}`);
    }
  }

  return getGuildSettings(guildId);
}

function getGuildSettings(guildId) {
  if (!guildId) return formatSettings('default');

  if (settingsCache.has(guildId)) {
    return settingsCache.get(guildId);
  }

  // หากยังไม่มีใน Cache ให้สร้างค่าเริ่มต้นและบันทึกลง MySQL เบื้องหลัง
  const defaultSettings = formatSettings(guildId);
  settingsCache.set(guildId, defaultSettings);

  if (isConnected && pool) {
    pool.query(`
      INSERT IGNORE INTO guild_settings (
        guild_id, verified_role_id, leader_role_id, admin_role_id,
        moderator_role_id, support_role_id, verify_channel_id, welcome_channel_id,
        goodbye_channel_id, enable_welcome, log_channel_id,
        enable_logs, enable_admin_commands, enable_moderation_commands,
        ticket_channel_id, ticket_category_id, music_channel_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      guildId,
      defaultSettings.verifiedRoleId,
      defaultSettings.leaderRoleId,
      defaultSettings.adminRoleId,
      defaultSettings.moderatorRoleId,
      defaultSettings.supportRoleId || null,
      defaultSettings.verifyChannelId,
      defaultSettings.welcomeChannelId,
      defaultSettings.goodbyeChannelId,
      defaultSettings.enableWelcomeSystem ? 1 : 0,
      defaultSettings.logChannelId,
      defaultSettings.enableLogSystem ? 1 : 0,
      defaultSettings.enableAdminCommands ? 1 : 0,
      defaultSettings.enableModerationCommands ? 1 : 0,
      defaultSettings.ticketChannelId || null,
      defaultSettings.ticketCategoryId || null,
      defaultSettings.musicChannelId || null
    ]).catch(err => logger.error('[MySQL Insert Error]:', err.message));
  }

  return defaultSettings;
}

/**
 * อัปเดตการตั้งค่าของเซิร์ฟเวอร์ลง MySQL พร้อมอัปเดต Cache ทันที
 * @param {string} guildId - Discord Guild ID
 * @param {object} newSettings - ข้อมูลการตั้งค่าใหม่
 * @returns {Promise<object>} การตั้งค่าที่อัปเดตแล้ว
 */
async function updateGuildSettings(guildId, newSettings) {
  if (!guildId) throw new Error('ต้องระบุ guildId');

  const current = getGuildSettings(guildId);

  const updated = {
    guildId,
    verifiedRoleId: newSettings.verifiedRoleId !== undefined ? newSettings.verifiedRoleId : current.verifiedRoleId,
    leaderRoleId: newSettings.leaderRoleId !== undefined ? newSettings.leaderRoleId : current.leaderRoleId,
    adminRoleId: newSettings.adminRoleId !== undefined ? newSettings.adminRoleId : current.adminRoleId,
    moderatorRoleId: newSettings.moderatorRoleId !== undefined ? newSettings.moderatorRoleId : current.moderatorRoleId,
    supportRoleId: newSettings.supportRoleId !== undefined ? newSettings.supportRoleId : current.supportRoleId,
    verifyChannelId: newSettings.verifyChannelId !== undefined ? newSettings.verifyChannelId : current.verifyChannelId,
    welcomeChannelId: newSettings.welcomeChannelId !== undefined ? newSettings.welcomeChannelId : current.welcomeChannelId,
    goodbyeChannelId: newSettings.goodbyeChannelId !== undefined ? newSettings.goodbyeChannelId : current.goodbyeChannelId,
    enableWelcomeSystem: newSettings.enableWelcomeSystem !== undefined ? Boolean(newSettings.enableWelcomeSystem) : current.enableWelcomeSystem,
    logChannelId: newSettings.logChannelId !== undefined ? newSettings.logChannelId : current.logChannelId,
    enableLogSystem: newSettings.enableLogSystem !== undefined ? Boolean(newSettings.enableLogSystem) : current.enableLogSystem,
    enableAdminCommands: newSettings.enableAdminCommands !== undefined ? Boolean(newSettings.enableAdminCommands) : current.enableAdminCommands,
    enableModerationCommands: newSettings.enableModerationCommands !== undefined ? Boolean(newSettings.enableModerationCommands) : current.enableModerationCommands,
    ticketChannelId: newSettings.ticketChannelId !== undefined ? newSettings.ticketChannelId : current.ticketChannelId,
    ticketCategoryId: newSettings.ticketCategoryId !== undefined ? newSettings.ticketCategoryId : current.ticketCategoryId,
    musicChannelId: newSettings.musicChannelId !== undefined ? newSettings.musicChannelId : current.musicChannelId,
    updatedAt: new Date().toISOString()
  };

  // อัปเดต Cache ทันที
  settingsCache.set(guildId, updated);

  // บันทึกลง MySQL
  if (isConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO guild_settings (
          guild_id, verified_role_id, leader_role_id, admin_role_id,
          moderator_role_id, support_role_id, verify_channel_id, welcome_channel_id,
          goodbye_channel_id, enable_welcome, log_channel_id,
          enable_logs, enable_admin_commands, enable_moderation_commands,
          ticket_channel_id, ticket_category_id, music_channel_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          verified_role_id = VALUES(verified_role_id),
          leader_role_id = VALUES(leader_role_id),
          admin_role_id = VALUES(admin_role_id),
          moderator_role_id = VALUES(moderator_role_id),
          support_role_id = VALUES(support_role_id),
          verify_channel_id = VALUES(verify_channel_id),
          welcome_channel_id = VALUES(welcome_channel_id),
          goodbye_channel_id = VALUES(goodbye_channel_id),
          enable_welcome = VALUES(enable_welcome),
          log_channel_id = VALUES(log_channel_id),
          enable_logs = VALUES(enable_logs),
          enable_admin_commands = VALUES(enable_admin_commands),
          enable_moderation_commands = VALUES(enable_moderation_commands),
          ticket_channel_id = VALUES(ticket_channel_id),
          ticket_category_id = VALUES(ticket_category_id),
          music_channel_id = VALUES(music_channel_id),
          updated_at = CURRENT_TIMESTAMP
      `, [
        guildId,
        updated.verifiedRoleId,
        updated.leaderRoleId,
        updated.adminRoleId,
        updated.moderatorRoleId,
        updated.supportRoleId || null,
        updated.verifyChannelId,
        updated.welcomeChannelId,
        updated.goodbyeChannelId,
        updated.enableWelcomeSystem ? 1 : 0,
        updated.logChannelId,
        updated.enableLogSystem ? 1 : 0,
        updated.enableAdminCommands ? 1 : 0,
        updated.enableModerationCommands ? 1 : 0,
        updated.ticketChannelId || null,
        updated.ticketCategoryId || null,
        updated.musicChannelId || null
      ]);

      logger.success(`[MySQL] บันทึกการตั้งค่าเซิร์ฟเวอร์ ${guildId} เรียบร้อยแล้ว`);
    } catch (error) {
      logger.error(`[MySQL Save Error]: ${error.message}`);
    }
  }

  return updated;
}

/**
 * เพิ่มและดึงลำดับหมายเลข Ticket ของเซิร์ฟเวอร์แบบ Atomic
 * @param {string} guildId 
 * @returns {Promise<number>} หมายเลข Ticket ถัดไป (1, 2, 3, ...)
 */
async function getNextTicketNumber(guildId) {
  if (!guildId) return 1;

  if (isConnected && pool) {
    try {
      await pool.query(
        'INSERT INTO guild_settings (guild_id, ticket_counter) VALUES (?, 1) ON DUPLICATE KEY UPDATE ticket_counter = ticket_counter + 1',
        [guildId]
      );
      const [rows] = await pool.query('SELECT ticket_counter FROM guild_settings WHERE guild_id = ?', [guildId]);
      if (rows && rows.length > 0 && rows[0].ticket_counter) {
        return Number(rows[0].ticket_counter);
      }
    } catch (err) {
      logger.error(`[MySQL Ticket Counter Error]: ${err.message}`);
    }
  }

  // Fallback: In-memory counter
  if (!global._ticketCounters) global._ticketCounters = new Map();
  const current = global._ticketCounters.get(guildId) || 0;
  const next = current + 1;
  global._ticketCounters.set(guildId, next);
  return next;
}


function isDbConnected() {
  return isConnected;
}

async function disconnectDatabase() {
  if (pool) {
    await pool.end();
    isConnected = false;
  }
}

module.exports = {
  isDbConnected,
  disconnectDatabase,
  getNextTicketNumber,
  fetchGuildSettingsFresh,
  initDatabase,
  getGuildSettings,
  updateGuildSettings
};
