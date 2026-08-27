# 🤖 UryuBot • Discord Multi-Purpose Suite & Web Dashboard

โปรเจกต์ Discord Bot อเนกประสงค์ระดับ Production สร้างด้วย **Node.js (Discord.js v14)** เชื่อมต่อฐานข้อมูล **MySQL (`mysql2`)** พร้อมหน้าเว็บ **Web Setup Dashboard & Remote Actions** ปลอดภัยสูงสุดด้วยระบบ **Discord OAuth2 Login (Server Owner Only)**

---

## 🌟 ฟีเจอร์หลักทั้งหมด (Key Modules)

### 1. 🌐 แผงตั้งค่าผ่านเว็บ & สั่งการบอทสด (Web Setup Dashboard)
- **🏰 เลือกลำดับเซิร์ฟเวอร์**: สลับเซิร์ฟเวอร์ที่บอทอยู่ได้แบบไดนามิก
- **🎛️ จัดการยศ (Roles Management)**: กำหนดยศ `Verified`, `Leader`, `Admin`, และ `Moderator`
- **📺 จัดการช่องระบบ (Channels Management)**: กำหนด `ช่องยืนยันตัวตน (Verify)`, `ช่องต้อนรับ (Welcome)`, `ช่องบอกลา (Goodbye)`, `ช่องบันทึกความปลอดภัย (Logs)`, `ช่องขอเพลง (Music)`, และ `หมวดหมู่ทิกเก็ต (Ticket Category)`
- **🔘 สวิตช์ฟังก์ชัน (Feature Toggles)**: เปิด/ปิดระบบต้อนรับ และระบบ Audit Logs
- **⚡ ศูนย์สั่งการด่วน (Remote Action Center)**:
  - 🔐 ส่งแผงยืนยันตัวตน CAPTCHA
  - 🎫 ส่งแผงเปิดทิกเก็ตช่วยเหลือ
  - 🎵 รีเซ็ตและติดตั้งห้องขอเพลง
  - 🚨 สวิตช์ล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (Lockdown Toggle)
- **📢 ส่งประกาศข่าวสารสด (Live Embed Announcer)**: พิมพ์หัวข้อ เนื้อหา เลือกสีแถบ และแปะรูปภาพ ยิงเข้า Discord ทันที

---

### 2. 🔑 ระบบความปลอดภัย Discord OAuth2 (Server Owner Guard)
- **Authorize App Login**: เข้าสู่ระบบผ่าน Discord OAuth2 ปลอดภัย 100%
- **👑 Server Owner Protection**: ตรวจสอบ `guild.ownerId === user.id` เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเข้าถึงแผงตั้งค่าและสั่งการบอทได้
- **🛡️ Protected REST APIs**: บล็อกการแก้ไขข้อมูลและคำสั่งควบคุมบอทจากผู้ไม่มีสิทธิ์ (`403 Forbidden`)

---

### 3. 🐬 ฐานข้อมูล MySQL (`mysql2/promise`) + In-Memory Cache
- **Auto Creation**: สร้าง Database `uryubot_db` และตาราง `guild_settings` อัตโนมัติเมื่อเริ่มระบบ
- **⚡ 0ms Latency Cache**: โหลดข้อมูลขึ้น Memory Cache ตอนสตาร์ทบอท ทำให้ทุก Event และคำสั่งตอบสนองได้ทันที
- **🛡️ Fail-Safe 100%**: หากไม่ได้เปิด MySQL บอทจะสลับไปใช้โหมด In-Memory + `.env` ชั่วคราว ป้องกันบอทแครช

---

### 4. 🎵 ระบบเครื่องเล่นเพลงคุณภาพสูง (DisTube 48kHz Stereo)
- **Dedicated Music Channel (`#ขอเพลง-music`)**: พิมพ์ชื่อเพลงหรือลิงก์ บอทจะลบข้อความและเริ่มเล่นเพลงทันที
- **Persistent In-Place Panel**: แผงควบคุมเพลง Standby แก้ไขข้อความเดิมในห้อง ไม่ส่งซ้ำซ้อน
- **Interactive Buttons**:
  - `⏮️ ก่อนหน้า`, `⏯️ พัก/เล่นต่อ`, `⏭️ ข้าม`, `⏹️ หยุด`
  - `🔉 -10%` / `🔊 +10%` ปุ่มปรับระดับเสียงแบบสดๆ
  - `🔁 วนซ้ำ` (ปิด / วนเพลง / วนทั้งคิว) และ `📜 ดูคิวเพลง`
- **รองรับแหล่งเพลง**: YouTube, Spotify, SoundCloud, และ Direct Audio Links

---

### 5. 🔐 ระบบยืนยันตัวตน CAPTCHA Modal
- สุ่มรหัสตัวอักษรและตัวเลข 6 หลักแบบไดนามิก ป้องกันบอทและไอดีป่วน
- แจกยศ Verified อัตโนมัติเมื่อกรอกรหัสถูกต้อง
- คำสั่ง: `/send-verify`

---

### 6. 🎫 ระบบทิกเก็ตแจ้งปัญหาพร้อม HTML Transcript
- สมาชิกกดปุ่มเปิดห้องทิกเก็ตส่วนตัว `#ticket-<username>`
- **HTML Transcript**: เมื่อปิดทิกเก็ต บอทจะสร้างไฟล์บทสนทนา `.html` สไตล์ Discord Dark Theme พร้อมรูป Avatar และเวลาส่ง ส่งตรงเข้า DM ผู้ใช้และช่องบันทึก Logs
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
| **🎵 ดนตรี (8)** | `/play <เพลง>` | ค้นหาและเริ่มเล่นเพลงจาก YouTube / Spotify | Everyone |
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
| **💬 ทั่วไป (3)** | `/help` | ดูคู่มือคำสั่งแบบ Dropdown สวยงาม | Everyone |
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

---

## 🛠️ ความต้องการของระบบ (Requirements)

- **Node.js**: เวอร์ชั่น `v18.0.0` หรือใหม่กว่า (แนะนำ `v20.x LTS`)
- **MySQL Database**: เช่น **MySQL Community Server 8.0+**, **XAMPP**, **Laragon**
- **FFmpeg**: จำเป็นสำหรับระบบเพลง (ติดตั้งมาในตัวผ่าน `ffmpeg-static`)
- **PM2**: สำหรับรันบอทบน Cloud VPS ตลอด 24 ชม.

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
เปิด Terminal / PowerShell บนคอมพิวเตอร์ของคุณ แล้วพิมพ์คำสั่ง:
```bash
ssh root@YOUR_SERVER_IP
# ตัวอย่าง: ssh root@119.10.137.245
```
*(กรอกรหัสผ่าน VPS ที่ได้รับจากผู้ให้บริการ)*

---

### 2. นำโค้ดโปรเจกต์ขึ้นเซิร์ฟเวอร์

#### วิธีที่ A: ผ่าน Git (แนะนำ)
```bash
cd /root
git clone <URL_GITHUB_REPOSITORY> UryuBot
cd UryuBot
```

#### วิธีที่ B: อัปโหลดผ่าน FileZilla / WinSCP
- เชื่อมต่อผ่านโปรโตคอล **SFTP** (Port: `22`, User: `root`, Host: `IP_SERVER`)
- ลากโฟลเดอร์โปรเจกต์ไปวางที่ `/root/UryuBot`

---

### 3. รันสคริปต์ 1-Click ติดตั้งอัตโนมัติ (1-Click Auto Deploy)
ในโฟลเดอร์โปรเจกต์บน VPS ให้พิมพ์คำสั่ง:
```bash
chmod +x deploy_vps.sh
./deploy_vps.sh
```
สคริปต์จะทำการ:
- 🔄 อัปเดตระบบ Ubuntu 24.04
- 🟢 ติดตั้ง Node.js 20 LTS + PM2
- 🐬 ติดตั้งและเปิดใช้งาน MySQL Server พร้อมสร้าง Database `uryubot_db`
- 🛡️ เปิดพอร์ต Firewall (`22`, `80`, `443`, `3000`)
- 📦 ติดตั้ง `npm install`
- 🚀 สตาร์ทบอทด้วย PM2 แบบ 24/7 Auto-Restart

---

### 4. สร้างและตั้งค่าไฟล์ `.env` บน Cloud VPS
พิมพ์คำสั่งสร้างไฟล์ `.env`:
```bash
nano .env
```
กรอกข้อมูลของบอท:
```env
# Discord Bot Credentials
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_CLIENT_ID

# Web Dashboard & Discord OAuth2 (ใช้ IP ของ VPS)
PORT=3000
CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
REDIRECT_URI=http://YOUR_SERVER_IP:3000/api/auth/callback
SESSION_SECRET=uryu_secure_session_key_2026

# MySQL Database (สร้างอัตโนมัติโดย deploy_vps.sh)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=uryuuser
DB_PASSWORD=UryuBotSecurePass2026!
DB_NAME=uryubot_db
```
*(กด `Ctrl + O` แล้วกด `Enter` เพื่อบันทึก และกด `Ctrl + X` เพื่อออก)*

---

### 5. ตั้งค่า Discord Developer Portal ให้ตรงกับ IP Cloud
1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications) > Application ของคุณ
2. เมนู **OAuth2** > หัวข้อ **Redirects**:
   - กด `Add Redirect`
   - เพิ่ม URL: `http://YOUR_SERVER_IP:3000/api/auth/callback` (เช่น `http://119.10.137.245:3000/api/auth/callback`)
   - กด **Save Changes**

---

### 6. เริ่มต้นและจัดการบอทด้วย PM2 (24/7 Management)

```bash
# สตาร์ทบอท / รีสตาร์ทหลังจากแก้ .env
npm run pm2:restart

# ตรวจสอบสถานะการทำงาน (Status / Memory / Uptime)
npm run pm2:status

# ดู Realtime Logs สดของบอท
npm run pm2:logs

# หยุดการทำงาน
npm run pm2:stop
```

---

## ⚡ วิธีซิงค์โค้ดจากเครื่องขึ้น Cloud VPS ทันที (1-Command Auto Sync)

เมื่อคุณเขียนโค้ดหรือปรับแต่งฟังก์ชันใหม่ๆ บนเครื่องคอมพิวเตอร์ของคุณเสร็จแล้ว ให้รันคำสั่งเพียงเท่านี้:

```bash
git add . && git commit -m "update bot" && git push
npm run sync
```

**สิ่งที่ระบบ `npm run sync` ทำงานอัตโนมัติ:**
1. 🚀 เชื่อมต่อ SSH ไปยัง Cloud VPS
2. 📦 สั่ง `git fetch` และ `git reset --hard origin/main` ดึงโค้ดเวอร์ชันล่าสุด
3. 📦 ตรวจสอบและอัปเดต `npm install --production`
4. 🔄 รีสตาร์ทบอทบน VPS ทันที (`pm2 restart uryubot`)
5. 📊 แสดงผลสถานะการทำงานสดของ PM2

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
UryuBot/
├── scripts/                  # สคริปต์ยูทิลิตี้เสริม
│   └── sync_to_vps.js        # ⚡ สคริปต์ 1-Command Auto Sync & Deploy ไปยัง VPS
├── src/
│   ├── commands/             # คำสั่ง Slash Commands แยก 5 หมวดหมู่
│   │   ├── admin/            # คำสั่งสำหรับผู้ดูแลระบบ
│   │   ├── fun/              # คำสั่งมินิเกมและบันเทิง
│   │   ├── general/          # คำสั่งทั่วไป (help, poll, ping)
│   │   ├── moderation/       # คำสั่งดูแลความสงบ (ban, kick, timeout, lockdown)
│   │   └── music/            # คำสั่งระบบดนตรี (play, skip, queue, volume)
│   ├── components/           # ตัวจัดการ Interaction Components
│   │   ├── buttons/          # ปุ่มกด (Verify, Ticket, Music Controls, Poll Vote)
│   │   ├── modals/           # หน้าต่าง Modal (CAPTCHA, Ticket Reason)
│   │   └── selectMenus/      # Dropdown เมนู (Help Menu)
│   ├── config/               # ค่าคงที่ ธีมสี และตัวแปรระบบ (config.js)
│   ├── database/             # ตัวจัดการฐานข้อมูล MySQL (db.js)
│   ├── events/               # ตัวดักจับ Discord Events (guild, client, message)
│   ├── handlers/             # ตัวโหลด Commands, Events, Components อัตโนมัติ
│   ├── utils/                # ยูทิลิตี้เสริม (Embeds, MusicManager, Permissions, Logger)
│   ├── web/                  # Express Web Server & Web Dashboard
│   │   ├── public/           # Frontend SPA (index.html, index.css, app.js)
│   │   └── server.js         # REST API & Discord OAuth2 Handler
│   └── index.js              # Entry Point เริ่มต้นระบบ
├── deploy_vps.sh             # 🚀 สคริปต์ 1-Click Auto Deploy บน Ubuntu 24.04
├── ecosystem.config.js       # ⚙️ การตั้งค่า PM2 24/7 Process Manager
├── .env.example              # ตัวอย่างไฟล์ Environment Variables
├── .gitignore                # การตั้งค่า Git Ignore
├── package.json              # รายการ Dependencies และ PM2 Scripts
└── README.md                 # คู่มือและเอกสารประกอบโปรเจกต์
```

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต **MIT License** &copy; 2026 UryuBot Suite.

