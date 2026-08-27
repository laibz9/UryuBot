/**
 * @file scripts/vps_start.js
 * @description สั่งเปิดบอทบน Cloud VPS ผ่าน Terminal บนเครื่องคอม
 */

require('dotenv').config();
const { Client } = require('ssh2');

const host = process.env.VPS_HOST;
const port = parseInt(process.env.VPS_PORT || '22', 10);
const username = process.env.VPS_USER || 'root';
const password = process.env.VPS_PASSWORD;

if (!host || !password) {
  console.error('❌ ไม่พบข้อมูลการเชื่อมต่อ VPS กรุณากำหนด VPS_HOST และ VPS_PASSWORD ใน .env ก่อนใช้งาน');
  process.exit(1);
}

const conn = new Client();
console.log(`🟢 กำลังสั่ง START บอทบน Cloud VPS (${host})...`);

conn.on('ready', () => {
  conn.exec('pm2 start uryubot && pm2 status', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('\n🎉 สั่งเปิดบอทบน Cloud VPS สำเร็จแล้ว!');
      conn.end();
    }).on('data', (data) => process.stdout.write(data));
  });
}).connect({ host, port, username, password });
