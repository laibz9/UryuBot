/**
 * @file src/handlers/eventHandler.js
 * @description ตัวโหลดไฟล์ Events อัตโนมัติจากโฟลเดอร์ src/events
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * โหลดไฟล์ Event Listeners ทั้งหมดและลงทะเบียนกับ Discord Client
 * @param {object} client - Instance ของ Discord Client
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');

  if (!fs.existsSync(eventsPath)) {
    logger.warn('ไม่พบโฟลเดอร์ events ข้ามการโหลด events');
    return;
  }

  const eventFolders = fs.readdirSync(eventsPath);
  let loadedCount = 0;

  for (const folder of eventFolders) {
    const folderPath = path.join(eventsPath, folder);

    if (fs.statSync(folderPath).isDirectory()) {
      const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of eventFiles) {
        const filePath = path.join(folderPath, file);
        const event = require(filePath);

        if (event && event.name && typeof event.execute === 'function') {
          if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
          } else {
            client.on(event.name, (...args) => event.execute(...args, client));
          }
          loadedCount++;
          logger.info(`โหลด Event Listener: ${event.name} สำเร็จ`);
        } else {
          logger.warn(`ไฟล์ Event ที่ ${filePath} ขาดคุณสมบัติ "name" หรือ "execute"`);
        }
      }
    }
  }

  logger.success(`โหลด Events ทั้งหมดสำเร็จ (${loadedCount} events)`);
}

module.exports = {
  loadEvents
};
