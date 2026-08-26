/**
 * @file src/utils/logger.js
 * @description ยูทิลิตี้สำหรับจัดรูปแบบและแสดงผล Console Log (INFO, WARN, ERROR, SUCCESS) พร้อม Timestamp
 */

/**
 * ดึงเวลาปัจจุบันในรูปแบบ ISO/HH:mm:ss
 * @returns {string} ข้อความเวลา
 */
function getTimestamp() {
  const now = new Date();
  return now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

/**
 * ตัวจัดการระบบ Log สำหรับแอปพลิเคชัน
 */
const logger = {
  /**
   * แสดงข้อความข้อมูลทั่วไป (INFO)
   * @param {string} message - ข้อความที่ต้องการแสดง
   */
  info: (message) => {
    console.log(`[\x1b[36mINFO\x1b[0m] [${getTimestamp()}] ${message}`);
  },

  /**
   * แสดงข้อความแจ้งเตือนความสำเร็จ (SUCCESS)
   * @param {string} message - ข้อความที่ต้องการแสดง
   */
  success: (message) => {
    console.log(`[\x1b[32mSUCCESS\x1b[0m] [${getTimestamp()}] ${message}`);
  },

  /**
   * แสดงข้อความคำเตือน (WARN)
   * @param {string} message - ข้อความที่ต้องการแสดง
   */
  warn: (message) => {
    console.warn(`[\x1b[33mWARN\x1b[0m] [${getTimestamp()}] ${message}`);
  },

  /**
   * แสดงข้อความข้อผิดพลาด (ERROR)
   * @param {string} message - ข้อความที่ต้องการแสดง
   * @param {Error|null} [error=null] - Object ของ Error (ถ้ามี)
   */
  error: (message, error = null) => {
    console.error(`[\x1b[31mERROR\x1b[0m] [${getTimestamp()}] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};

module.exports = logger;
