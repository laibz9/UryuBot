/**
 * @file src/index.js
 * @description จุดเริ่มต้นของแอปพลิเคชัน (Entry Point) เริ่มต้น Discord Client และดักจับ Process Errors
 */

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config/config');
const logger = require('./utils/logger');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadComponents } = require('./handlers/componentHandler');

// ==========================================
// 1. การดักจับ Process Errors (Defensive Guards)
// ==========================================

// ดักจับ Unhandled Promise Rejections เพื่อป้องกันบอทค้างหรือดับ
process.on('unhandledRejection', (reason, promise) => {
  logger.error('พบ Unhandled Rejection ในระบบ:', reason);
});

// ดักจับ Uncaught Exceptions
process.on('uncaughtException', (error, origin) => {
  logger.error(`พบ Uncaught Exception (Origin: ${origin}):`, error);
});

// ==========================================
// 2. เริ่มต้นสร้าง Discord Client Instance
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // จำเป็นสำหรับการจัดการเซิร์ฟเวอร์ คำสั่ง และโครงสร้างช่อง
    GatewayIntentBits.GuildMembers,     // จำเป็นสำหรับการดึงข้อมูลสมาชิก และการจัดการ Role (Privileged Intent)
    GatewayIntentBits.GuildMessages,    // จำเป็นสำหรับการส่งข้อความและ Embeds
    GatewayIntentBits.MessageContent,   // จำเป็นสำหรับการอ่านเนื้อหาข้อความ (สำหรับระบบ Log ข้อความลบ/แก้ไข)
    GatewayIntentBits.GuildModeration,  // จำเป็นสำหรับการดักจับเหตุการณ์ Ban/Unban/Timeout (Audit Mod Events)
    GatewayIntentBits.GuildVoiceStates  // จำเป็นสำหรับการเชื่อมต่อห้องเสียง Voice Channel เพื่อเล่นเพลง
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// ==========================================
// 3. กำหนดค่า Collections และเริ่มต้นระบบเพลง
// ==========================================

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();

const { initDisTube } = require('./utils/musicManager');
initDisTube(client);

// ==========================================
// 4. โหลด Handlers ทั้งหมด
// ==========================================

logger.info('กำลังเริ่มต้นระบบและโหลดโมดูลต่างๆ...');
loadCommands(client);
loadEvents(client);
loadComponents(client);

// ==========================================
// 5. เข้าสู่ระบบ Discord API
// ==========================================

if (!config.bot.token) {
  logger.error('ไม่พบ DISCORD_TOKEN ในไฟล์ .env กรุณาระบุ Token ก่อนเริ่มต้นใช้งาน');
  process.exit(1);
}

client.login(config.bot.token).catch((error) => {
  logger.error('ไม่สามารถเชื่อมต่อกับ Discord API ได้ (Token อาจไม่ถูกต้อง):', error);
});
