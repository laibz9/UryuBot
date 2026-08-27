# 🤖 UryuBot • Enterprise Discord Suite & Web Dashboard

<div align="center">

![UryuBot Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop)

[![Discord.js](https://img.shields.io/badge/discord.js-v14.16.3-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![DisTube](https://img.shields.io/badge/DisTube-v5.2.3-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://distube.js.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Express](https://img.shields.io/badge/Express-v4.19.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**สุดยอดโปรเจกต์ Discord Bot อเนกประสงค์ระดับ Enterprise สร้างด้วย Node.js (Discord.js v14)**  
เชื่อมต่อฐานข้อมูล **MySQL Cloud** พร้อมหน้าเว็บ **Web Setup Dashboard v4.0** สไตล์ **Cyberpunk Glassmorphism**  
ปลอดภัยสูงสุดด้วยระบบ **Discord OAuth2 Authorized App (Server Owner Only)**

[🌟 ฟีเจอร์เด่น](#-ฟีเจอร์หลักทั้งหมด-key-modules) • [📜 สารบัญคำสั่ง (33 คำสั่ง)](#-สารบัญคำสั่งทั้งหมด-slash-commands-directory---33-คำสั่ง) • [💻 วิธีติดตั้ง Local](#-วิธีรันบนเครื่องคอมพิวเตอร์ส่วนตัว-local-development) • [🚀 นำขึ้น Cloud VPS](#-วิธีนำบอทขึ้น-cloud-vps-ubuntu-2404-lts) • [🔄 ระบบซิงค์ 1-Click](#-ระบบซิงค์-1-click-local---vps)

</div>

---

## 🌟 ฟีเจอร์หลักทั้งหมด (Key Modules)

### 1. 🌐 แผงควบคุมและตั้งค่าผ่านเว็บ (Web Setup Dashboard v4.0)
- **💎 Enterprise Cyberpunk Glassmorphism UI**: ดีไซน์กระจก Frosted Glass ซ้อนเลเยอร์ พร้อมเอฟเฟกต์ไฟนีออน Ambient Mesh Animation
- **🏰 Dynamic Guild Selector**: สลับเลือกดูและตั้งค่าเซิร์ฟเวอร์ที่บอทประจำการอยู่ได้ทันที
- **🎛️ Roles Management**: กำหนดยศสำคัญของระบบ เช่น `Verified Role`, `Leader Role`, `Admin Role`, และ `Moderator Role`
- **📺 Channels Management**: กำหนดช่องข้อความอัตโนมัติ (`Verify`, `Welcome`, `Goodbye`, `Audit Logs`, `Music Room`, `Ticket Category`)
- **🔘 Feature Toggles**: สวิตช์เปิด/ปิดระบบต้อนรับ & บอกลา และระบบบันทึกความปลอดภัย
- **⚡ Remote Action Center**:
  - 🔐 **ส่งแผงยืนยันตัวตน**: ส่ง Embed ปุ่มเปิด CAPTCHA Modal
  - 🎫 **ส่งแผงเปิดทิกเก็ต**: ส่ง Embed ปุ่มเปิดห้อง Ticket
  - 🎵 **รีเซ็ตห้องเพลง**: ล้างข้อความตกค้างและส่งแผง Standby Player
  - 🚨 **สวิตช์ล็อกดาวน์**: สลับสถานะเปิด/ปิด Emergency Lockdown ฉุกเฉิน
- **📢 Live Embed Announcer**: พิมพ์หัวข้อ เนื้อหา เลือกสีแถบ และแปะรูปภาพ ยิงเข้าห้อง Discord ทันทีแบบ Realtime

---

### 2. 🔑 ระบบความปลอดภัย Discord OAuth2 (Server Owner Guard)
- **Authorize App Login**: เข้าสู่ระบบผ่าน Discord OAuth2 อย่างปลอดภัย
- **👑 Server Owner Protection**: ระบบตรวจสอบสิทธิ์ `guild.ownerId === user.id` ให้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเข้าถึงแผงตั้งค่าและกดสั่งการบอทได้
- **🛡️ Protected REST API**: บล็อกคำสั่งและการบันทึกข้อมูลจากผู้ไม่มีสิทธิ์ (`403 Forbidden`)

---

### 3. 🐬 ฐานข้อมูล MySQL (`mysql2/promise`) + 0ms Fast Memory Cache
- **Auto Database & Table Init**: สร้างฐานข้อมูล `uryubot_db` และตาราง `guild_settings` ให้อัตโนมัติเมื่อสตาร์ท
- **⚡ 0ms Fast Memory Cache**: โหลดการตั้งค่าทั้งหมดขึ้น Memory ทันที ทำให้ทุก Event และคำสั่งไม่ต้องรอ Query ข้อมูลซ้ำซ้อน
- **🛡️ Fail-Safe 100%**: หากระบบฐานข้อมูลขัดข้อง บอทจะสลับไปใช้โหมด In-Memory + `.env` ชั่วคราว ป้องกันบอทแครช

---

### 4. 🎵 ระบบเครื่องเล่นเพลงคุณภาพสูง (DisTube v5 + Custom yt-dlp Extractor)
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

### 5. 🔐 ระบบยืนยันตัวตน CAPTCHA Modal
- สุ่มรหัสตัวอักษรและตัวเลข 6 หลักแบบไดนามิก ป้องกันบอทและไอดีป่วน
- แจกยศ Verified อัตโนมัติเมื่อกรอกรหัสถูกต้อง
- คำสั่ง: `/send-verify`

---

### 6. 🎫 ระบบทิกเก็ตแจ้งปัญหาพร้อม HTML Transcript
- สมาชิกกดปุ่มเปิดห้องทิกเก็ตส่วนตัว `#ticket-<username>`
- **HTML Transcript**: เมื่อปิดทิกเก็ต บอทจะสร้างไฟล์ประวัติแชท `.html` สไตล์ Discord Dark Theme พร้อมรูป Avatar และเวลาส่ง ส่งตรงเข้า DM ผู้ใช้และช่องบันทึก Logs
- คำสั่ง: `/send-ticket`

---

### 7. 🚨 ล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (Emergency Lockdown)
- **Lockdown ON**: ปิดสิทธิ์การพิมพ์ของสมาชิกทั้งเซิร์ฟเวอร์หรือเฉพาะห้องได้ทันทีเมื่อเกิดเหตุ
- **Lockdown OFF**: ปลดล็อกดาวน์คืนสิทธิ์การส่งข้อความกลับสู่สภาวะปกติในคลิกเดียว
- คำสั่ง: `/lockdown on/off`

---

### 8. 📊 โพลสำรวจความคิดเห็นสด & มินิเกมบันเทิง
- **/poll**: สร้างโพลสำรวจความคิดเห็น 2-5 ตัวเลือก พร้อม **Progress Bar สด `[████████░░] 80%`**
- **/fortune**: เขย่าเซียมซีทำนายดวงประจำวัน พร้อมเลขเด็ดและสีมงคล
- **/hug**: ส่งอ้อมกอดอุ่นๆ มอบกำลังใจให้เพื่อนพร้อมภาพ GIF น่ารัก
- **/joke**, **/8ball**, **/coinflip**, **/dice**

---

## 📜 สารบัญคำสั่งทั้งหมด (Slash Commands Directory - 33 คำสั่ง)

| หมวดหมู่ | คำสั่ง | คำอธิบาย | สิทธิ์ขั้นต่ำ |
| :--- | :--- | :--- | :--- |
| **🎵 ดนตรี (8)** | `/play <เพลง>` | ค้นหาและเริ่มเล่นเพลงจาก YouTube / Spotify / SoundCloud | Everyone |
| | `/skip` | ข้ามไปยังเพลงถัดไปในคิว | Everyone |
| | `/pause` | พักการเล่นเพลงชั่วคราว | Everyone |
| | `/resume` | เล่นเพลงต่อจากที่หยุดไว้ | Everyone |
| | `/stop` | หยุดเล่น ล้างคิว และออกจากห้องเสียง | Everyone |
| | `/queue` | ดูรายการคิวเพลงที่กำลังรอเล่น | Everyone |
| | `/volume <ระดับ>` | ปรับระดับความดังเสียง (1 - 100%) | Everyone |
| | `/loop <โหมด>` | ตั้งค่าโหมดเล่นวนซ้ำ (ปิด/เพลงนี้/ทั้งคิว) | Everyone |
| **🎉 บันเทิง (6)** | `/fortune` | เขย่าเซียมซีทำนายดวงประจำวัน พร้อมเลขเด็ด | Everyone |
| | `/hug <สมาชิก>` | ส่งอ้อมกอดอุ่นๆ ให้เพื่อนพร้อม GIF | Everyone |
| | `/joke` | สุ่มเล่ามุกตลกฮาๆ | Everyone |
| | `/8ball <คำถาม>` | ถามลูกแก้ววิเศษ 8-Ball ทำนายคำตอบ | Everyone |
| | `/coinflip` | สุ่มเสี่ยงทายโยนเหรียญ หัว หรือ ก้อย | Everyone |
| | `/dice [หน้า]` | ทอยลูกเต๋าสุ่มแต้ม | Everyone |
| **💬 ทั่วไป (3)** | `/help` | ดูคู่มือและคำอธิบายการใช้งานบอทแบบ Interactive Dropdown | Everyone |
| | `/poll <คำถาม> <ตัวเลือก>` | สร้างโพลสำรวจความคิดเห็นสดพร้อมปุ่มโหวต | Everyone |
| | `/ping` | ตรวจสอบความเร็ว Latency และ WebSocket Ping | Everyone |
| **🛡️ ดูแลความสงบ (9)** | `/lockdown <สถานะ>` | 🚨 ล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (เปิด/ปิด) | Manage Channels |
| | `/kick <สมาชิก> [เหตุผล]` | เตะสมาชิกออกจากเซิร์ฟเวอร์ | Kick Members |
| | `/ban <สมาชิก> [เหตุผล]` | แบนสมาชิกออกจากเซิร์ฟเวอร์ถาวร | Ban Members |
| | `/unban <user_id>` | ปลดแบนผู้ใช้งานด้วย User ID | Ban Members |
| | `/timeout <สมาชิก> <เวลา>` | ปิดการใช้งานแชทชั่วคราว | Moderate Members |
| | `/untimeout <สมาชิก>` | ยกเลิกการปิดแชทชั่วคราว | Moderate Members |
| | `/clear <จำนวน>` | ลบข้อความจำนวนมากในช่องแชท (1-100) | Manage Messages |
| | `/userinfo [สมาชิก]` | ตรวจสอบประวัติ วันสมัครบัญชี และยศ | Everyone |
| | `/serverinfo` | ตรวจสอบสถิติและข้อมูลของเซิร์ฟเวอร์ | Everyone |
| **👑 ผู้ดูแลระบบ (7)** | `/setup-roles` | 👑 สร้างยศ Leader, Admin, Mod, Verified อัตโนมัติ | Leader / Owner |
| | `/setup-welcome` | 👋 ตั้งค่าช่องต้อนรับและบอกลาสมาชิก | Administrator |
| | `/setup-logs` | 🛡️ ตั้งค่าช่องบันทึกประวัติ Audit Logs | Administrator |
| | `/setup-music` | 🎵 ติดตั้งห้องขอเพลงเฉพาะพร้อมแผง Standby | Administrator |
| | `/send-verify` | 🔐 ส่งแผงยืนยันตัวตน CAPTCHA Modal | Administrator |
| | `/send-ticket` | 🎫 ส่งแผงเปิดทิกเก็ตขอความช่วยเหลือ | Administrator |
| | `/announce` | 📢 ส่งประกาศข่าวสารทางการแบบ Embed หรูหรา | Manage Messages |

---

## 🛠️ ความต้องการของระบบ (Requirements)

- **Node.js**: เวอร์ชั่น `v18.0.0` หรือใหม่กว่า (แนะนำ `v20.x LTS` หรือ `v22.x`)
- **MySQL Database**: เช่น **MySQL Server 8.0+**, **XAMPP**, **Laragon**
- **FFmpeg**: จำเป็นสำหรับระบบเสียง (ติดตั้งอัตโนมัติบน Windows / `apt install ffmpeg` บน Linux)

---

## 💻 วิธีรันบนเครื่องคอมพิวเตอร์ส่วนตัว (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. กำหนดค่าในไฟล์ `.env`
คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วกรอกข้อมูล:
```env
# Discord Bot Credentials
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_CLIENT_ID

# Web Dashboard & Discord OAuth2
PORT=3000
CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=uryu_secure_session_key_2026

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=uryubot_db
```

### 3. สตาร์ทบอท
```bash
npm start
```
- เข้าใช้งาน Web Dashboard ได้ที่: 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 วิธีนำบอทขึ้น Cloud VPS (Ubuntu 24.04 LTS)

### 1. เชื่อมต่อ SSH เข้า Cloud VPS
```bash
ssh root@YOUR_SERVER_IP
# ตัวอย่าง: ssh root@119.10.137.245
```

### 2. โคลนโปรเจกต์จาก GitHub
```bash
cd /root
git clone https://github.com/laibz9/UryuBot.git UryuBot
cd UryuBot
```

### 3. รันสคริปต์ 1-Click ติดตั้งอัตโนมัติ (1-Click Auto Deploy)
```bash
chmod +x deploy_vps.sh
./deploy_vps.sh
```

---

## 🔄 ระบบซิงค์ 1-Click (Local -> VPS)

เมื่อคุณแก้ไขโค้ดบนเครื่องคอมพิวเตอร์และ Push ขึ้น GitHub แล้ว สามารถซิงค์โค้ดทั้งหมดลง VPS ได้ทันทีด้วยคำสั่งเดียว:
```bash
npm run sync
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
UryuBot/
├── .env.example                # ตัวอย่างการกำหนดค่า Environment Variables
├── .gitignore                  # กรองไฟล์ที่ไม่ต้องการอัปโหลดขึ้น Git
├── deploy_vps.sh               # สคริปต์ติดตั้งอัตโนมัติบน Ubuntu Cloud VPS
├── ecosystem.config.js         # ไฟล์คอนฟิก PM2 Process Manager
├── package.json                # ข้อมูลโปรเจกต์และ Dependencies
├── README.md                   # เอกสารคู่มือการใช้งานบอท
├── scripts/
│   └── sync_to_vps.js          # สคริปต์ซิงค์โค้ดอัตโนมัติจาก Local ไปยัง VPS
└── src/
    ├── config/
    │   ├── config.js           # โหลด Environment Variables และตั้งค่าระบบ
    │   └── theme.js            # ค่าสี Hex, ไอคอน และสไตล์ Embed
    ├── database/
    │   ├── db.js               # เชื่อมต่อ MySQL และ In-Memory Cache Sync
    │   └── migrations.js       # สร้างตารางและคอลัมน์อัตโนมัติ
    ├── events/
    │   ├── client/             # Event Ready, Error, Rate Limit
    │   ├── guild/              # Event Member Add/Remove, Voice State Update
    │   ├── interactions/       # Interaction Create, Buttons, Modals, Autocomplete
    │   └── messages/           # Message Create (ดักจับเพลงในช่องขอเพลง)
    ├── slashCommands/
    │   ├── admin/              # คำสั่งผู้ดูแลระบบ (/setup-*, /send-*, /announce)
    │   ├── fun/                # คำสั่งบันเทิง (/fortune, /hug, /joke, /8ball)
    │   ├── general/            # คำสั่งทั่วไป (/help, /poll, /ping)
    │   ├── moderation/         # คำสั่งดูแลความสงบ (/lockdown, /ban, /clear)
    │   └── music/              # คำสั่งเพลง (/play, /skip, /stop, /queue)
    ├── utils/
    │   ├── customYtDlpPlugin.js# Plugin สตรีมเสียงความเร็วสูง bypass YouTube blocks
    │   ├── logger.js           # ระบบแสดงผล Logs สวยงาม
    │   ├── musicManager.js     # ควบคุม DisTube และแผง Standby ในห้องเพลง
    │   └── transcriptGenerator.js # แปลงประวัติแชท Ticket เป็น HTML หรูหรา
    └── web/
        ├── server.js           # Express API Server & Discord OAuth2
        └── public/             # เว็บ Dashboard (HTML / CSS / JS)
```

---

<div align="center">

**Developed with ❤️ by UryuBot Team**  
*Protected by Discord OAuth2 & Cloud Realtime Architecture.*

</div>
