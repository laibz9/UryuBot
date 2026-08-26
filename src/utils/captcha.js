/**
 * @file src/utils/captcha.js
 * @description ยูทิลิตี้สำหรับสุ่มสร้างรหัส CAPTCHA ความยาว 6 ตัวอักษร
 */

const config = require('../config/config');

/**
 * สุ่มสร้างรหัส CAPTCHA ความยาวตามที่กำหนดใน config (ตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ + ตัวเลข)
 * @param {number} [length=config.captcha.length] - ความยาวของรหัส CAPTCHA ที่ต้องการสร้าง
 * @returns {string} รหัส CAPTCHA ที่สุ่มเรียบร้อยแล้ว
 */
function generateCaptcha(length = config.captcha.length) {
  const chars = config.captcha.characters;
  let result = '';
  const charsLength = chars.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsLength);
    result += chars.charAt(randomIndex);
  }

  return result;
}

module.exports = {
  generateCaptcha
};
