#!/usr/bin/env bash
# ==============================================================================
# 🚀 UryuBot • 1-Click Ubuntu 24.04 LTS Cloud VPS Auto-Deploy Script
# ==============================================================================
# Script นี้จะติดตั้ง Node.js 20, MySQL 8, FFmpeg, PM2, และตั้งค่า 24/7 อัตโนมัติ
# ==============================================================================

set -e

echo -e "\e[1;36m=====================================================\e[0m"
echo -e "\e[1;36m       🤖 UryuBot Cloud VPS Deployment System        \e[0m"
echo -e "\e[1;36m             Ubuntu 24.04 LTS x64 Auto-Setup         \e[0m"
echo -e "\e[1;36m=====================================================\e[0m"

# 1. Update Packages
echo -e "\n\e[1;33m[1/6] 🔄 กำลังอัปเดตระบบปฏิบัติการ Ubuntu...\e[0m"
apt update && apt upgrade -y
apt install -y curl git ffmpeg build-essential ufw libtool autoconf automake

# 2. Install Node.js 20 LTS
echo -e "\n\e[1;33m[2/6] 🟢 กำลังติดตั้ง Node.js 20.x LTS และ PM2...\e[0m"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js Version: $(node -v)"
echo "NPM Version: $(npm -v)"

npm install -g pm2

# 3. Install & Configure MySQL Server
echo -e "\n\e[1;33m[3/6] 🐬 กำลังติดตั้งและตั้งค่า MySQL Server...\e[0m"
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# สร้าง Database และ User (ถ้ายังไม่มี)
mysql -e "CREATE DATABASE IF NOT EXISTS uryubot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'uryuuser'@'localhost' IDENTIFIED BY 'UryuBotSecurePass2026!';"
mysql -e "GRANT ALL PRIVILEGES ON uryubot_db.* TO 'uryuuser'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "✅ MySQL Database 'uryubot_db' พร้อมใช้งานแล้ว"

# 4. Configure Firewall
echo -e "\n\e[1;33m[4/6] 🛡️ กำลังตั้งค่าความปลอดภัย Firewall (UFW)...\e[0m"
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP Web
ufw allow 443/tcp    # HTTPS Web
ufw allow 3000/tcp   # Web Dashboard Port
ufw --force enable

# 5. Install Project Dependencies
echo -e "\n\e[1;33m[5/6] 📦 กำลังติดตั้งโมดูล Node.js (Dependencies)...\e[0m"
npm install --production

# 6. PM2 Autostart
echo -e "\n\e[1;33m[6/6] 🚀 เริ่มต้นรันบอทผ่าน PM2 แบบ 24/7...\e[0m"
mkdir -p logs
pm2 delete uryubot 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash || true

echo -e "\n\e[1;32m=====================================================\e[0m"
echo -e "\e[1;32m   🎉 ติดตั้ง UryuBot บน Ubuntu Cloud VPS สำเร็จแล้ว!  \e[0m"
echo -e "\e[1;32m=====================================================\e[0m"
echo -e "🔹 ตรวจสอบสถานะบอท: \e[1;36mpm2 status\e[0m"
echo -e "🔹 ดู Log สดของบอท:   \e[1;36mpm2 logs uryubot\e[0m"
echo -e "🔹 รีสตาร์ทบอท:       \e[1;36mpm2 restart uryubot\e[0m"
echo -e "🔹 เว็บแดชบอร์ด:       \e[1;36mhttp://YOUR_SERVER_IP:3000\e[0m"
echo -e "\e[1;32m=====================================================\e[0m"
