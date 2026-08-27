/**
 * @file scripts/vps_logs.js
 * @description ดึง Log สดแบบ Realtime ของบอทจาก Cloud VPS มาแสดงผลบนหน้าจอ Terminal ทันที
 */

require('dotenv').config();
const { Client } = require('ssh2');

const host = process.env.VPS_HOST;
const port = parseInt(process.env.VPS_PORT || '22', 10);
const username = process.env.VPS_USER || 'root';
const password = process.env.VPS_PASSWORD;

if (!host || !password) {
  console.error('❌ ไม่พบข้อมูลการเชื่อมต่อ VPS กรุณากำหนด VPS_HOST และ VPS_PASSWORD ในไฟล์ .env ก่อนใช้งาน');
  process.exit(1);
}

const config = {
  host,
  port,
  username,
  password
};

console.log(`📡 กำลังเชื่อมต่อ Cloud VPS (${host}) เพื่อดึง Log สดของ UryuBot...`);
console.log('💡 กด Ctrl + C เพื่อออกจากหน้าดู Log\n--------------------------------------------');

const conn = new Client();

conn.on('ready', () => {
  conn.exec('pm2 logs uryubot --lines 30', (err, stream) => {
    if (err) throw err;

    stream.on('close', () => {
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err.message);
}).connect(config);
