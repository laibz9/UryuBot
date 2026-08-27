/**
 * @file scripts/sync_to_vps.js
 * @description 1-Command Auto-Deploy: ดึงโค้ดล่าสุดบน Cloud VPS และรีสตาร์ทบอททันทีใน 2 วินาที
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

console.log(`🚀 [1/3] กำลังเชื่อมต่อ Cloud VPS (${host})...`);

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ [2/3] เชื่อมต่อสำเร็จ! กำลังซิงค์โค้ดจาก GitHub และอัปเดตบอท...');

  const cmd = `
    cd /root/UryuBot && 
    git fetch origin main && 
    git reset --hard origin/main && 
    npm install --production && 
    pm2 restart uryubot && 
    pm2 status
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\n🎉 [3/3] ซิงค์โค้ดขึ้น Cloud VPS และเริ่มรันบอทเวอร์ชันล่าสุดสำเร็จแล้ว! (Code: ${code})`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err.message);
}).connect(config);
