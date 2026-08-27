/**
 * @file scripts/sync_to_vps.js
 * @description 1-Command Auto-Deploy: ดึงโค้ดล่าสุดบน Cloud VPS และรีสตาร์ทบอททันทีใน 2 วินาที
 */

const { Client } = require('ssh2');

const config = {
  host: '119.10.137.245',
  port: 22,
  username: 'root',
  password: 'W!!4Zi0bAgq6'
};

console.log('🚀 [1/3] กำลังเชื่อมต่อ Cloud VPS...');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ [2/3] เชื่อมต่อสำเร็จ! กำลัง Git Pull และอัปเดตบอท...');

  const cmd = `
    cd /root/UryuBot && 
    git pull origin main || git pull origin master && 
    npm install --production && 
    pm2 restart uryubot && 
    pm2 status
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\n🎉 [3/3] อัปเดตโค้ดและรีสตาร์ทบอทบน Cloud VPS สำเร็จแล้ว! (Code: ${code})`);
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
