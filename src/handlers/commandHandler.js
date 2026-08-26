/**
 * @file src/handlers/commandHandler.js
 * @description ตัวโหลดไฟล์ Slash Commands อัตโนมัติจากโฟลเดอร์ src/commands
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * โหลดไฟล์คำสั่งทั้งหมดและจัดเก็บใน client.commands Collection
 * @param {object} client - Instance ของ Discord Client
 */
function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');

  if (!fs.existsSync(commandsPath)) {
    logger.warn('ไม่พบโฟลเดอร์ commands ข้ามการโหลดคำสั่ง');
    return;
  }

  const categoryFolders = fs.readdirSync(commandsPath);
  let loadedCount = 0;

  for (const folder of categoryFolders) {
    const folderPath = path.join(commandsPath, folder);

    // ตรวจสอบว่าเป็นไดเรกทอรีหรือไม่
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        // ตรวจสอบว่าโมดูลมีข้อมูล data และ execute ครบถ้วนหรือไม่
        if (command && command.data && typeof command.execute === 'function') {
          client.commands.set(command.data.name, command);
          loadedCount++;
          logger.info(`โหลดคำสั่ง Slash Command: /${command.data.name} สำเร็จ`);
        } else {
          logger.warn(`ไฟล์คำสั่งที่ ${filePath} ขาดคุณสมบัติ "data" หรือ "execute"`);
        }
      }
    }
  }

  logger.success(`โหลดคำสั่ง Slash Commands ทั้งหมดสำเร็จ (${loadedCount} คำสั่ง)`);
}

module.exports = {
  loadCommands
};
