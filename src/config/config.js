/**
 * @file src/config/config.js
 * @description ไฟล์กำหนดค่าคงที่ (Constants), ธีมสี, และรูปภาพ/GIF สำหรับ Embed สวยงาม
 */

require('dotenv').config();

module.exports = {
  // การตั้งค่า Bot Tokens และ IDs จากไฟล์ .env
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID,
    leaderRoleId: process.env.LEADER_ROLE_ID,
    adminRoleId: process.env.ADMIN_ROLE_ID,
    moderatorRoleId: process.env.MODERATOR_ROLE_ID,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    goodbyeChannelId: process.env.GOODBYE_CHANNEL_ID,
    verifyChannelId: process.env.VERIFY_CHANNEL_ID || process.env.WELCOME_CHANNEL_ID,
    enableWelcomeSystem: process.env.ENABLE_WELCOME_SYSTEM !== 'false',
    logChannelId: process.env.LOG_CHANNEL_ID,
    enableLogSystem: process.env.ENABLE_LOG_SYSTEM !== 'false',
    enableAdminCommands: process.env.ENABLE_ADMIN_COMMANDS !== 'false',
    enableModerationCommands: process.env.ENABLE_MODERATION_COMMANDS !== 'false',
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    musicChannelId: process.env.MUSIC_CHANNEL_ID,
    webPort: parseInt(process.env.PORT || '3000', 10),
    clientSecret: process.env.CLIENT_SECRET || '',
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    sessionSecret: process.env.SESSION_SECRET || 'uryu_secure_session_key_2026'
  },

  // ข้อมูลเซิร์ฟเวอร์ Cloud VPS สำหรับการเชื่อมต่อและ Sync
  vps: {
    host: process.env.VPS_HOST || '119.10.137.245',
    port: parseInt(process.env.VPS_PORT || '22', 10),
    username: process.env.VPS_USER || 'root',
    password: process.env.VPS_PASSWORD || ''
  },

  // การตั้งค่าฐานข้อมูล MySQL (mysql2)
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'uryubot_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  },

  // การตั้งค่าระบบเพลง (DisTube & Audio Engine)
  music: {
    defaultVolume: 100,
    maxQueueSize: 500,
    searchLimit: 10,
    sampleRate: 48000,
    channels: 2,
    audioQuality: 'high'
  },

  // ธีมสีสากลของ Embed (ระบบ Hex Colors สไตล์ Cyberpunk / Modern Dark)
  colors: {
    primary: '#2B2D31',   // สี Dark Theme หรูหรา เรียบหรู
    accent: '#00F0FF',    // สี Cyan นีออน สำหรับไฮไลท์หลัก
    purple: '#9D4EDD',    // สีม่วงนีออน
    success: '#57F287',   // สีเขียวสดใส แจ้งเตือนเมื่อสำเร็จ
    danger: '#ED4245',    // สีแดงสดใส แจ้งเตือนข้อผิดพลาด
    warning: '#FEE75C',   // สีเหลือง แจ้งเตือนคำเตือน
    info: '#5865F2'       // สี Blurple มาตรฐาน Discord
  },

  // รูปภาพและ GIF สำหรับตกแต่ง Embed
  assets: {
    verifyBanner: process.env.VERIFY_BANNER_URL || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXBybHprZnVrbnkxdHl1NHAyaGszNWh0eWRsM2xsNm1ub2QxMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
    welcomeBanner: process.env.WELCOME_BANNER_URL || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FwZjVjOWp5NmxnMzhhZWFtNndhYmNwdDdwNHh2c3BqNWt6ZmdxNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYC0LajbaPoEADu/giphy.gif',
    goodbyeBanner: process.env.GOODBYE_BANNER_URL || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1aGNtc2w0OGpsbTV2bHhpZWdrMWtyZnoxMmswbHF6MjdlaHliYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4b45b8KXYCitkY/giphy.gif',
    musicStandbyBanner: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZzaGhhNTRrNXkxbndxczI4cnpna2tzYnR4cTN6enhrNHpzNWg5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHG5KGFxSkUWw1i/giphy.gif',
    successGif: process.env.SUCCESS_GIF_URL || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXoxeGt0OGoxOHJhZDNqZXdndW5zMnUxbmd1dWRuNDlnNnpudXdpOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g9582DNuQppxC/giphy.gif',
    errorGif: process.env.ERROR_GIF_URL || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2RraTFzbHZlOTVndWdyazRrcnhjMnZwZHk4OTg0OG5tZnVrc2FwNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11tTNkKOscJG6Y/giphy.gif',
    securityIcon: 'https://cdn-icons-png.flaticon.com/512/1069/1069210.png'
  },

  // องค์ประกอบของ CAPTCHA
  captcha: {
    length: 6,
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  },

  // ข้อความสำเร็จและข้อผิดพลาดมาตรฐาน
  messages: {
    alreadyVerified: 'คุณผ่านการยืนยันตัวตนไปแล้ว ไม่สามารถกดซ้ำได้',
    captchaIncorrect: 'รหัส CAPTCHA ไม่ถูกต้อง กรุณากดปุ่มลองใหม่อีกครั้ง',
    verifySuccess: 'ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับเข้าสู่เซิร์ฟเวอร์',
    missingBotPermission: 'ระบบไม่สามารถทำรายการได้ เนื่องจากบอทขาดสิทธิ์ที่จำเป็น',
    roleHierarchyError: 'ระบบไม่สามารถทำรายการได้ เนื่องจากตำแหน่งยศของเป้าหมายสูงกว่าหรือเท่ากับยศของบอท',
    userHierarchyError: 'คุณไม่สามารถทำรายการกับผู้ใช้งานที่มีตำแหน่งยศสูงกว่าหรือเท่ากับยศของคุณได้',
    cannotTargetSelf: 'คุณไม่สามารถรันคำสั่งลงโทษตัวเองได้',
    cannotTargetBot: 'คุณไม่สามารถรันคำสั่งลงโทษบอทตัวนี้ได้',
    roleNotFound: 'ไม่พบยศยืนยันตัวตนในระบบ กรุณาตรวจสอบการตั้งค่า VERIFIED_ROLE_ID หรือตั้งค่าผ่าน Web Dashboard',
    genericError: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้งในภายหลัง'
  }
};
