/**
 * @file deploy-commands.js
 * @description สคริปต์ลงทะเบียน Slash Commands เข้าสู่ Discord API (REST v10)
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

// ตรวจสอบค่าตัวแปรสภาพแวดล้อมเบื้องต้น
if (!config.bot.token || !config.bot.clientId) {
  logger.error('กรุณาระบุ DISCORD_TOKEN และ CLIENT_ID ในไฟล์ .env ก่อนทำการลงทะเบียนคำสั่ง');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');

if (fs.existsSync(commandsPath)) {
  const categoryFolders = fs.readdirSync(commandsPath);

  for (const folder of categoryFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if (command && command.data) {
          commands.push(command.data.toJSON());
          logger.info(`เตรียมลงทะเบียนคำสั่ง: /${command.data.name}`);
        }
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.bot.token);

(async () => {
  try {
    logger.info(`กำลังเริ่มต้นลงทะเบียน Slash Commands ทั้งหมด ${commands.length} คำสั่งไปยัง Discord API...`);

    if (config.bot.guildId) {
      // ลงทะเบียนเฉพาะใน Guild ID ที่ระบุ (แสดงผลทันที ไม่ต้องรอ Discord Global Propagate)
      const data = await rest.put(
        Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
        { body: commands }
      );
      logger.success(`ลงทะเบียน Guild Slash Commands สำเร็จทั้งหมด ${data.length} คำสั่ง (Guild ID: ${config.bot.guildId})`);
    } else {
      // ลงทะเบียนแบบ Global (ใช้เวลาประมาณ 1 ชั่วโมงทั่วโลก)
      const data = await rest.put(
        Routes.applicationCommands(config.bot.clientId),
        { body: commands }
      );
      logger.success(`ลงทะเบียน Global Slash Commands สำเร็จทั้งหมด ${data.length} คำสั่ง`);
    }
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการลงทะเบียน Slash Commands:', error);
  }
})();
