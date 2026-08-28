# 🤖 UryuBot • Enterprise Discord Suite & Web Dashboard v4.5

<div align="center">

![UryuBot Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop)

[![Discord.js](https://img.shields.io/badge/discord.js-v14.16.3-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![DisTube](https://img.shields.io/badge/DisTube-v5.2.3-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://distube.js.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Express](https://img.shields.io/badge/Express-v4.19.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Production Ready](https://img.shields.io/badge/Status-100%25%20Passing-success?style=for-the-badge)](https://github.com/laibz9/UryuBot)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**สุดยอดโปรเจกต์ Discord Bot อเนกประสงค์ระดับ Enterprise พัฒนาด้วย Node.js (Discord.js v14)**  
เชื่อมต่อฐานข้อมูล **MySQL Cloud Database** พร้อมหน้าเว็บ **Web Setup Dashboard v4.5** สไตล์ **Cyberpunk Glassmorphism**  
ปลอดภัยสูงสุดด้วยระบบ **Discord OAuth2 Authorized App (Server Owner Only)**

[🌟 ฟีเจอร์เด่น](#-ฟีเจอร์หลักทั้งหมด-key-modules) • [📜 สารบัญคำสั่ง (33 คำสั่ง)](#-สารบัญคำสั่งทั้งหมด-slash-commands-directory---33-คำสั่ง) • [💻 วิธีติดตั้ง Local](#-วิธีรันบนเครื่องคอมพิวเตอร์ส่วนตัว-local-development) • [🚀 นำขึ้น Cloud VPS](#-วิธีนำบอทขึ้น-cloud-vps-ubuntu-2404-lts) • [🔄 ระบบซิงค์ 1-Click](#-ระบบซิงค์-1-click-local---vps)

</div>

---

## 🌟 ฟีเจอร์หลักทั้งหมด (Key Modules)

### 1. 🌐 แผงควบคุมและตั้งค่าผ่านเว็บ (Web Setup Dashboard v4.5)
- **💎 Enterprise Cyberpunk Glassmorphism UI**: ดีไซน์กระจก Frosted Glass 3 คอลัมน์ (Roles, Channels, Features) สไตล์ iOS Emerald Glow & Cyan Neon
- **🏰 Dynamic Server Selector**: สลับเลือกเซิร์ฟเวอร์ และโหลดข้อมูลจาก MySQL Database แบบ Realtime 0ms ไม่มีบัคสลับค่า
- **🎛️ Roles Management**: กำหนดยศสำคัญของระบบ (`Verified`, `Leader`, `Admin`, `Moderator`, และ `🎧 Support`)
- **📺 Channels Management**: กำหนดช่องข้อความอัตโนมัติ (`Verify`, `Welcome`, `Goodbye`, `Audit Logs`, `Music Room`, `Ticket Channel`, `Ticket Category`)
- **🔘 Feature Toggles**: สวิตช์เปิด/ปิดระบบต้อนรับ & บอกลา, ระบบ Audit Logs, คำสั่ง Admin, และคำสั่ง Moderation
- **⚡ Remote Action Center**:
  - 🔐 **ส่งแผงยืนยันตัวตน**: ส่ง Embed ปุ่มเปิด CAPTCHA Modal
  - 🎫 **ส่งแผงเปิดทิกเก็ต**: ส่ง Embed ปุ่มเปิดห้อง Ticket เข้าช่อง Ticket Channel ที่เลือกไว้โดยตรง
  - 🎵 **รีเซ็ตห้องเพลง**: ล้างข้อความตกค้างและส่งแผง Standby Player
  - 🚨 **สวิตช์ล็อกดาวน์**: สลับสถานะเปิด/ปิด Emergency Lockdown ฉุกเฉิน
- **🎛️ Live DJ Studio & Turntable Deck**: ค้นหาเพลง สตรีมเพลง เลือกห้องเสียง ปรับ Volume Slider ควบคุมคิวเพลง Realtime
- **📢 1:1 Discord Embed Live Preview Studio**: ออกแบบข้อความ Embed พร้อมแสดงตัวอย่างสดขนาด 1:1 สไตล์ Discord Dark Card UI (#2b2d31) และส่งประกาศทันที

---

### 2. 🔑 ระบบความปลอดภัย Discord OAuth2 (Server Owner Guard)
- **Authorize App Login**: เข้าสู่ระบบผ่าน Discord OAuth2 อย่างปลอดภัย
- **👑 Server Owner Protection**: ระบบตรวจสอบสิทธิ์ `guild.ownerId === user.id` ให้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเข้าถึงแผงตั้งค่าและกดสั่งการบอทได้
- **🛡️ Protected REST API**: บล็อกคำสั่งและการบันทึกข้อมูลจากผู้ไม่มีสิทธิ์ (`403 Forbidden`)

---

### 3. 🐬 ฐานข้อมูล MySQL (`mysql2/promise`) + 0ms Fast Memory Cache
- **Auto Database & Table Migration**: สร้างฐานข้อมูล `uryubot_db` และตาราง `guild_settings` พร้อม Auto Migration เพิ่มคอลัมน์ใหม่อัตโนมัติเมื่อสตาร์ท
- **⚡ 0ms Fast Memory Cache**: โหลดการตั้งค่าทั้งหมดขึ้น Memory ทันที ทำให้ทุก Event และคำสั่งไม่ต้องรอ Query ข้อมูลซ้ำซ้อน
- **🛡️ Fail-Safe 100%**: หากระบบฐานข้อมูลขัดข้อง บอทจะสลับไปใช้โหมด In-Memory + `.env` ชั่วคราว ป้องกันบอทแครช

---

### 4. 🎫 ระบบ Support Ticket & Auto-Lifecycle Category Management
- **รันลำดับตัวเลข Ticket อัตโนมัติ**: สร้างห้องชื่อ `ticket-<username>-<number>` (เช่น `ticket-laibz9-1`, `ticket-ggerg-2`) ป้องกันชื่อซ้ำกัน
- **Auto-Create Category**: หากในเซิร์ฟเวอร์ยังไม่มี Category Ticket บอทจะสร้างหมวดหมู่ **`🎫 TICKETS`** ให้อัตโนมัติทันที
- **Tag All Staff Roles**: เมื่อเปิดตั๋ว บอทจะแท็กเรียก **Support**, **Admin**, **Leader**, **Moderator** ทุกคนทันที
- **Staff Closing Permissions**: ทีมงาน Support, Admin, Leader, Moderator, และ Server Owner สามารถกดปุ่ม **"🔒 ปิดตั๋ว (Close Ticket)"** ของตั๋วใครก็ได้ในเซิร์ฟเวอร์
- **HTML Transcript**: เมื่อปิดทิกเก็ต บอทจะสร้างไฟล์ประวัติแชท `.html` สไตล์ Discord Dark Theme พร้อมรูป Avatar และเวลาส่ง ส่งตรงเข้า DM ผู้ใช้และช่องบันทึก Logs
- **Auto-Delete Category**: เมื่อปิดและลบ Ticket ห้องสุดท้ายในหมวดหมู่ บอทจะลบ Category `🎫 TICKETS` ทิ้งอัตโนมัติเพื่อความเป็นระเบียบของเซิร์ฟเวอร์

---

### 5. 🎵 ระบบเครื่องเล่นเพลงคุณภาพสูง (DisTube v5 + Custom yt-dlp Extractor)
- **Cross-Platform Audio Engine**:
  - 🪟 **Windows**: ใช้ `ffmpeg-static` + `yt-dlp.exe` อัตโนมัติ
  - 🐧 **Linux VPS**: ใช้ Native `/usr/bin/ffmpeg` + `/usr/local/bin/yt-dlp` รองรับ TLS/SSL Bypass สตรีมลื่นไหล ไม่ตัดเสียง
- **Dedicated Music Room (`#ขอเพลง-music`)**: พิมพ์ชื่อเพลงหรือลิงก์ บอทจะลบข้อความและเริ่มเล่นเพลงให้อัตโนมัติ
- **Persistent In-Place Panel**: แผงควบคุมเพลง Standby อัปเดตข้อความเดิม ไม่สแปมช่องแชท
- **Interactive Control Buttons**:
  - `⏮️ ก่อนหน้า`, `⏯️ พัก/เล่นต่อ`, `⏭️ ข้าม`, `⏹️ หยุด`
  - `🔉 -10%` / `🔊 +10%` ปุ่มปรับระดับความดังเสียงแบบเรียลไทม์
  - `🔁 วนซ้ำ` (ปิด / วนเพลง / วนทั้งคิว) และ `📜 ดูคิวเพลง`
- **Auto-Leave 60s**: เมื่อไม่มีสมาชิกอยู่ในห้องเสียงเกิน 60 วินาที บอทจะตัดการเชื่อมต่อและรีเซ็ตแผงเพลงให้อัตโนมัติ

---

### 6. 🔐 ระบบยืนยันตัวตน CAPTCHA Modal
- สุ่มรหัสตัวอักษรและตัวเลข 6 หลักแบบไดนามิก ป้องกันบอทและไอดีป่วน
- แจกยศ Verified อัตโนมัติเมื่อกรอกรหัสถูกต้อง
- คำสั่ง: `/send-verify`

---

### 7. 👑 ระบบสร้างยศอัตโนมัติ (`/setup-roles`)
- สร้างยศสำคัญ 5 ระดับพร้อมกำหนดสิทธิ์ (Permissions) และสีประจำยศ:
  - 👑 **Leader**: สีทอง (`#F1C40F`) — Administrator
  - 👑 **Admin**: สีแดง (`#E74C3C`) — Administrator
  - 🛠️ **Moderator**: สีฟ้า (`#3498DB`) — เตะ, แบน, ปิดแชท, ลบข้อความ
  - 🎧 **Support**: สีเขียวอมฟ้า (`#1ABC9C`) — ดูแลตอบตั๋ว Ticket & จัดการข้อความ
  - ✅ **Member**: สีเขียว (`#2ECC71`) — สมาชิกทั่วไปที่ผ่านการ Verify
- บันทึก Role IDs ลงฐานข้อมูล MySQL อัตโนมัติทันที

---

### 8. 🚨 ล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (Emergency Lockdown)
- **Lockdown ON**: ปิดสิทธิ์การพิมพ์ของสมาชิกทั้งเซิร์ฟเวอร์หรือเฉพาะห้องได้ทันทีเมื่อเกิดเหตุ
- **Lockdown OFF**: ปลดล็อกดาวน์คืนสิทธิ์การส่งข้อความกลับสู่สภาวะปกติในคลิกเดียว
- คำสั่ง: `/lockdown on/off`

---

### 9. 📊 โพลสำรวจความคิดเห็นสด & มินิเกมบันเทิง
- **/poll**: สร้างโพลสำรวจความคิดเห็น 2-5 ตัวเลือก พร้อม **Progress Bar สด `[████████░░] 80%`**
- **/fortune**: เขย่าเซียมซีทำนายดวงประจำวัน พร้อมเลขเด็ดและสีมงคล
- **/hug**: ส่งอ้อมกอดอุ่นๆ มอบกำลังใจให้เพื่อนพร้อมภาพ GIF น่ารัก
- **/joke**, **/8ball**, **/coinflip**, **/dice**

---

## 📜 สารบัญคำสั่งทั้งหมด (Slash Commands Directory - 33 คำสั่ง)

| หมวดหมู่ | คำสั่ง | คำอธิบาย | สิทธิ์ขั้นต่ำ |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `/setup-roles` | 👑 สร้างยศ Leader, Admin, Mod, Support, Member อัตโนมัติ | Leader / Owner |
| | `/send-verify` | 🔐 ส่งแผงยืนยันตัวตน CAPTCHA Modal | Leader / Owner |
| | `/send-ticket` | 🎫 ส่งแผงเปิดตั๋ว Support Ticket พร้อม HTML Transcript | Leader / Owner |
| | `/setup-music` | 🎵 ติดตั้งห้องขอเพลงประจำเซิร์ฟเวอร์ | Leader / Owner |
| | `/setup-logs` | 📁 ติดตั้งช่องบันทึกประวัติความปลอดภัย (Audit Logs) | Leader / Owner |
| | `/announce` | 📢 ส่งข้อความประกาศพร้อม Embed สวยงาม | Admin / Leader |
| **🛠️ Moderation** | `/ban` | 🔨 แบนสมาชิกออกจากเซิร์ฟเวอร์ | Ban Members |
| | `/unban` | 🔓 ปลดแบนสมาชิกด้วย User ID | Ban Members |
| | `/kick` | 👢 เตะสมาชิกออกจากเซิร์ฟเวอร์ | Kick Members |
| | `/timeout` | ⏳ ระงับการพิมพ์ชั่วคราว (Timeout) | Moderate Members |
| | `/untimeout` | ⏱️ ยกเลิกการระงับพิมพ์ | Moderate Members |
| | `/clear` | 🧹 ลบข้อความในห้องแชท (1-100 ข้อความ) | Manage Messages |
| | `/lockdown` | 🚨 เปิด/ปิดโหมดล็อกดาวน์ฉุกเฉิน | Manage Channels |
| **🎵 Music** | `/play` | 🎶 เล่นเพลงจาก YouTube, Spotify, SoundCloud | สมาชิกทุกคน |
| | `/pause` | ⏸️ พักการเล่นเพลงชั่วคราว | สมาชิกทุกคน |
| | `/resume` | ▶️ เล่นเพลงต่อ | สมาชิกทุกคน |
| | `/skip` | ⏭️ ข้ามไปยังเพลงถัดไป | สมาชิกทุกคน |
| | `/stop` | ⏹️ หยุดเล่นเพลงและล้างคิว | สมาชิกทุกคน |
| | `/queue` | 📜 แสดงรายการเพลงในคิว | สมาชิกทุกคน |
| | `/volume` | 🔊 ปรับระดับเสียง (0-100%) | สมาชิกทุกคน |
| | `/loop` | 🔁 สลับโหมดวนซ้ำ (ปิด/เพลง/คิว) | สมาชิกทุกคน |
| **ℹ️ General** | `/help` | 📖 เมนูคู่มือการใช้งานคำสั่งทั้งหมด | สมาชิกทุกคน |
| | `/ping` | 🏓 ตรวจสอบค่าความหน่วงของบอทและฐานข้อมูล | สมาชิกทุกคน |
| | `/botinfo` | 🤖 แสดงข้อมูลสเปกบอทและระบบเซิร์ฟเวอร์ | สมาชิกทุกคน |
| | `/serverinfo` | 🏰 แสดงข้อมูลสถิติของเซิร์ฟเวอร์ | สมาชิกทุกคน |
| | `/userinfo` | 👤 ดูข้อมูลและสถิติของผู้ใช้งาน | สมาชิกทุกคน |
| | `/avatar` | 🖼️ ดูรูปโปรไฟล์ขนาดเต็มของผู้ใช้ | สมาชิกทุกคน |
| **🎉 Fun & Games** | `/poll` | 📊 สร้างโพลสำรวจความคิดเห็นพร้อมกราฟิก Realtime | สมาชิกทุกคน |
| | `/fortune` | 🥠 เสี่ยงเซียมซีทำนายดวงประจำวัน | สมาชิกทุกคน |
| | `/hug` | 🤗 ส่งกอดให้เพื่อนพร้อมภาพ GIF | สมาชิกทุกคน |
| | `/8ball` | 🎱 ถามคำถามกับลูกแก้ววิเศษ | สมาชิกทุกคน |
| | `/coinflip` | 🪙 โยนเหรียญหัว-ก้อย | สมาชิกทุกคน |
| | `/dice` | 🎲 ทอยลูกเต๋าสุ่มแต้ม 1-6 | สมาชิกทุกคน |
| | `/joke` | 🤣 เล่าเรื่องตลกเบาสมอง | สมาชิกทุกคน |

---

## 💻 วิธีรันบนเครื่องคอมพิวเตอร์ส่วนตัว (Local Development)

### 1. โคลนโปรเจกต์และติดตั้ง Dependencies:
```bash
git clone https://github.com/laibz9/UryuBot.git
cd UryuBot
npm install
```

### 2. กำหนดค่าในไฟล์ `.env`:
สร้างไฟล์ `.env` โดยคัดลอกจาก `.env.example`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=your_secret_key_here
PORT=3000

DB_HOST=119.10.137.245
DB_PORT=3306
DB_USER=buktoon24991
DB_PASSWORD=!Toon@24991
DB_NAME=uryubot_db
```

### 3. รันบอท:
```bash
npm start
```
เปิดเบราว์เซอร์ไปยัง [http://localhost:3000](http://localhost:3000) เพื่อเข้าสู่ Web Setup Dashboard

---

## 🚀 วิธีนำบอทขึ้น Cloud VPS (Ubuntu 24.04 LTS)

### 1. เข้าสู่ระบบ VPS และเตรียม Environment:
```bash
ssh root@119.10.137.245
apt update && apt upgrade -y
apt install -y nodejs npm git ffmpeg python3
npm install -g pm2
```

### 2. โคลนโปรเจกต์และตั้งค่า PM2:
```bash
git clone https://github.com/laibz9/UryuBot.git /root/UryuBot
cd /root/UryuBot
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔄 ระบบซิงค์ 1-Click (Local ➡️ VPS)

โปรเจกต์มีสคริปต์ Sync อัตโนมัติ:
```bash
node sync_and_pull.js
```
สคริปต์จะเชื่อมต่อไปยัง Cloud VPS สั่ง `git pull` และ `pm2 restart` ให้อัตโนมัติภายใน 3 วินาที!

---

<div align="center">
  <sub>Developed with ❤️ by the UryuBot Development Team • Enterprise Production Edition 2026</sub>
</div>
