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
  const c = config.bot;
  if (!row) {
    return {
      guildId,
      verifiedRoleId: c.verifiedRoleId || '',
      leaderRoleId: c.leaderRoleId || '',
      adminRoleId: c.adminRoleId || '',
      moderatorRoleId: c.moderatorRoleId || '',
      verifyChannelId: c.verifyChannelId || c.welcomeChannelId || '',
      welcomeChannelId: c.welcomeChannelId || '',
      goodbyeChannelId: c.goodbyeChannelId || '',
      enableWelcomeSystem: c.enableWelcomeSystem !== false,
      logChannelId: c.logChannelId || '',
      enableLogSystem: c.enableLogSystem !== false,
      ticketCategoryId: c.ticketCategoryId || '',
      musicChannelId: c.musicChannelId || '',
      updatedAt: new Date().toISOString()
    };
  }

  return {
    guildId: row.guild_id,
    verifiedRoleId: row.verified_role_id || c.verifiedRoleId || '',
    leaderRoleId: row.leader_role_id || c.leaderRoleId || '',
    adminRoleId: row.admin_role_id || c.adminRoleId || '',
    moderatorRoleId: row.moderator_role_id || c.moderatorRoleId || '',
    verifyChannelId: row.verify_channel_id || c.verifyChannelId || c.welcomeChannelId || '',
    welcomeChannelId: row.welcome_channel_id || c.welcomeChannelId || '',
    goodbyeChannelId: row.goodbye_channel_id || c.goodbyeChannelId || '',
    enableWelcomeSystem: row.enable_welcome === 1 || row.enable_welcome === true,
    logChannelId: row.log_channel_id || c.logChannelId || '',
    enableLogSystem: row.enable_logs === 1 || row.enable_logs === true,
    ticketCategoryId: row.ticket_category_id || c.ticketCategoryId || '',
    musicChannelId: row.music_channel_id || c.musicChannelId || '',
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
        verify_channel_id VARCHAR(32) DEFAULT NULL,
        welcome_channel_id VARCHAR(32) DEFAULT NULL,
        goodbye_channel_id VARCHAR(32) DEFAULT NULL,
        enable_welcome TINYINT(1) DEFAULT 1,
        log_channel_id VARCHAR(32) DEFAULT NULL,
        enable_logs TINYINT(1) DEFAULT 1,
        ticket_category_id VARCHAR(32) DEFAULT NULL,
        music_channel_id VARCHAR(32) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
        moderator_role_id, verify_channel_id, welcome_channel_id,
        goodbye_channel_id, enable_welcome, log_channel_id,
        enable_logs, ticket_category_id, music_channel_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      guildId,
      defaultSettings.verifiedRoleId,
      defaultSettings.leaderRoleId,
      defaultSettings.adminRoleId,
      defaultSettings.moderatorRoleId,
      defaultSettings.verifyChannelId,
      defaultSettings.welcomeChannelId,
      defaultSettings.goodbyeChannelId,
      defaultSettings.enableWelcomeSystem ? 1 : 0,
      defaultSettings.logChannelId,
      defaultSettings.enableLogSystem ? 1 : 0,
      defaultSettings.ticketCategoryId,
      defaultSettings.musicChannelId
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
    verifyChannelId: newSettings.verifyChannelId !== undefined ? newSettings.verifyChannelId : current.verifyChannelId,
    welcomeChannelId: newSettings.welcomeChannelId !== undefined ? newSettings.welcomeChannelId : current.welcomeChannelId,
    goodbyeChannelId: newSettings.goodbyeChannelId !== undefined ? newSettings.goodbyeChannelId : current.goodbyeChannelId,
    enableWelcomeSystem: newSettings.enableWelcomeSystem !== undefined ? Boolean(newSettings.enableWelcomeSystem) : current.enableWelcomeSystem,
    logChannelId: newSettings.logChannelId !== undefined ? newSettings.logChannelId : current.logChannelId,
    enableLogSystem: newSettings.enableLogSystem !== undefined ? Boolean(newSettings.enableLogSystem) : current.enableLogSystem,
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
          moderator_role_id, verify_channel_id, welcome_channel_id,
          goodbye_channel_id, enable_welcome, log_channel_id,
          enable_logs, ticket_category_id, music_channel_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          verified_role_id = VALUES(verified_role_id),
          leader_role_id = VALUES(leader_role_id),
          admin_role_id = VALUES(admin_role_id),
          moderator_role_id = VALUES(moderator_role_id),
          verify_channel_id = VALUES(verify_channel_id),
          welcome_channel_id = VALUES(welcome_channel_id),
          goodbye_channel_id = VALUES(goodbye_channel_id),
          enable_welcome = VALUES(enable_welcome),
          log_channel_id = VALUES(log_channel_id),
          enable_logs = VALUES(enable_logs),
          ticket_category_id = VALUES(ticket_category_id),
          music_channel_id = VALUES(music_channel_id),
          updated_at = CURRENT_TIMESTAMP
      `, [
        guildId,
        updated.verifiedRoleId,
        updated.leaderRoleId,
        updated.adminRoleId,
        updated.moderatorRoleId,
        updated.verifyChannelId,
        updated.welcomeChannelId,
        updated.goodbyeChannelId,
        updated.enableWelcomeSystem ? 1 : 0,
        updated.logChannelId,
        updated.enableLogSystem ? 1 : 0,
        updated.ticketCategoryId,
        updated.musicChannelId
      ]);

      logger.success(`[MySQL] บันทึกการตั้งค่าเซิร์ฟเวอร์ ${guildId} เรียบร้อยแล้ว`);
    } catch (error) {
      logger.error(`[MySQL Save Error]: ${error.message}`);
    }
  }

  return updated;
}

module.exports = {
  initDatabase,
  getGuildSettings,
  updateGuildSettings
};
