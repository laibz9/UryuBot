# 🤖 UryuBot • Discord Multi-Purpose Suite

โปรเจกต์ Discord Bot อเนกประสงค์ระดับ Production สร้างด้วยภาษา JavaScript (Node.js) บนสถาปัตยกรรม **Discord.js v14** พร้อมระบบความปลอดภัย, การจัดการคอมมูนิตี้, ระบบทิกเก็ตพร้อม HTML Transcript, ระบบดนตรีคุณภาพสูง 2-in-1, ระบบโพลสด และระบบล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน

---

## 🌟 ฟีเจอร์หลักทั้งหมด (Key Features)

### 1. 🔐 ระบบยืนยันตัวตน (Dynamic CAPTCHA Verification)
- **CAPTCHA Modal**: สุ่มรหัสตัวอักษรและตัวเลข 6 หลักแบบไดนามิก ป้องกันบอทและผู้ไม่หวังดี
- **Role Hierarchy & Defensive Checks**: ตรวจสอบลำดับยศและสิทธิ์ของบอทอย่างปลอดภัย
- **คำสั่ง**: `/send-verify`

### 2. 👑 ระบบจัดการยศและบทบาททีมงาน (Role Management System)
- ตั้งค่ายศ **👑 Leader**, **🛡️ Admin**, **⚔️ Moderator**, และ **✅ Verified Member**
- **คำสั่ง**: `/setup-roles`

### 3. 👋 ระบบต้อนรับและบอกลาสมาชิก (Welcome & Goodbye System)
- แจ้งเตือนเมื่อมีสมาชิกใหม่เข้าเซิร์ฟเวอร์ และสมาชิกออกจากเซิร์ฟเวอร์
- ดึงข้อมูลสมาชิก รูปโปรไฟล์, จำนวนสมาชิกปัจจุบัน และวันสมัครบัญชี
- **คำสั่ง**: `/setup-welcome`

### 4. 🛡️ ระบบบันทึกประวัติความปลอดภัย (Audit Logger & Mod Tracker)
- บันทึกประวัติการลบข้อความ (Message Delete) พร้อมระบุตัวผู้ลบ
- บันทึกประวัติการแก้ไขข้อความ (Message Edit)
- บันทึกการลงโทษของแอดมิน (Kick, Ban, Timeout, Clear)
- **ระบบคัดกรองอัจฉริยะ**: ไม่บันทึกการกระทำของบอทด้วยกันเอง และข้ามห้องขอเพลงเพื่อความสะอาดตา
- **คำสั่ง**: `/setup-logs`

### 5. 🚨 ระบบล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (Server Lockdown / Panic Mode)
- **Lockdown ON**: ปิดสิทธิ์การพิมพ์ของสมาชิก (`@everyone` และ Verified Role) ทันที เมื่อมีเหตุด่วน
- **Lockdown OFF**: ปลดล็อกดาวน์คืนสิทธิ์การส่งข้อความกลับสู่สภาวะปกติในคลิกเดียว
- เลือกขอบเขตได้ทั้ง **เฉพาะช่องปัจจุบัน** หรือ **ทั้งเซิร์ฟเวอร์ทุกช่อง**
- **คำสั่ง**: `/lockdown`

### 6. 🎫 ระบบทิกเก็ตแจ้งปัญหาพร้อม HTML Transcript (Ticket Support)
- สมาชิกกดปุ่มเปิดห้องทิกเก็ตส่วนตัว `#ticket-<username>`
- มีระบบสิทธิ์ความปลอดภัย: เฉพาะผู้เปิดและทีมงานเท่านั้นที่มองเห็น
- **HTML Transcript**: เมื่อปิดทิกเก็ต บอทจะสร้างไฟล์บทสนทนา `.html` สไตล์ **Discord Dark Theme** พร้อมรูป Avatar และเวลาส่ง ส่งตรงเข้า DM ผู้ใช้และช่อง `#logs`
- **คำสั่ง**: `/send-ticket`

### 7. 📊 ระบบโพลสดและประกาศข่าวสาร (Live Polls & Announcements)
- **/poll**: สร้างโพลสำรวจความคิดเห็น 2-5 ตัวเลือก พร้อม **Progress Bar แบบสดๆ `[████████░░] 80%`** (มี Cooldown 60s สร้างโพล และ 10s ต่อการกดโหวต)
- **/announce**: ส่งประกาศทางการพร้อมแถบสี, รูปแบนเนอร์, แท็ก `@everyone` หรือ `@here`

### 8. 🎵 ระบบเครื่องเล่นเพลง 2-in-1 (DisTube High-Quality Music Suite)
- **Dedicated Request Channel (`#ขอเพลง-music`)**: พิมพ์ชื่อเพลงหรือแปะลิงก์ในห้อง บอทจะลบข้อความอัตโนมัติและเล่นเพลงทันที
- **Single Persistent Panel**: แผงควบคุมเพลงจะแก้ไขข้อความเดิม (In-Place Edit) ไม่ส่งข้อความใหม่ซ้ำซ้อน
- **Interactive Button Controls**:
  - `⏮️ ก่อนหน้า`, `⏯️ พัก/เล่นต่อ`, `⏭️ ข้าม`, `⏹️ หยุด`
  - `🔉 -10%` / `🔊 +10%` ปุ่มปรับระดับเสียงแบบสดๆ
  - `🔁 วนซ้ำ` (ปิด / วนเพลง / วนทั้งคิว) และ `📜 ดูคิวเพลง`
- **รองรับแหล่งเพลง**: YouTube, Spotify, SoundCloud, และ Direct Audio Links
- **Slash Commands**: `/play`, `/skip`, `/pause`, `/resume`, `/stop`, `/queue`, `/volume`, `/loop`, `/setup-music`

### 9. 🔨 ระบบจัดการความสงบเรียบร้อย (Moderation Suite)
- **/ban & /unban**: แบนและปลดแบนสมาชิก พร้อมระบุเหตุผลและลบข้อความย้อนหลัง
- **/kick**: เตะสมาชิกออกจากเซิร์ฟเวอร์
- **/timeout & /untimeout**: ปิดการส่งข้อความชั่วคราว (1 นาที - 28 วัน)
- **/clear**: ลบข้อความจำนวนมากแบบ Bulk Delete (1 - 100 ข้อความ) พร้อมกรองเฉพาะข้อความบอทหรือเฉพาะบุคคล
- **/serverinfo & /userinfo**: เช็คข้อมูลเชิงลึกของเซิร์ฟเวอร์และสมาชิก

### 10. 🎉 ระบบความบันเทิงและมินิเกม (Fun Suite)
- **/8ball**: ลูกแก้วพยากรณ์คำตอบ
- **/coinflip**: เสี่ยงทายหัว-ก้อย
- **/dice**: ทอยลูกเต๋า
- **/fortune**: เซียมซีทำนายดวงชะตา
- **/hug**: ส่งการ์ดกอดเพื่อน
- **/joke**: สุ่มมุกตลกกวนๆ
- **/ping**: เช็คค่าความหน่วง Latency ของบอทและ WebSocket พร้อมสถานะ Streaming

---

## 📋 ตารางคำสั่งทั้งหมด 32 Slash Commands

| หมวดหมู่ | คำสั่ง | คำอธิบาย | สิทธิ์ขั้นต่ำ |
| :--- | :--- | :--- | :--- |
| **Admin** | `/setup-roles` | ตั้งค่ายศ Leader, Admin, Mod และ Member | Server Owner / Leader |
| **Admin** | `/setup-welcome` | ตั้งค่าช่องต้อนรับและบอกลาสมาชิก | Server Owner / Leader |
| **Admin** | `/setup-logs` | ตั้งค่าช่องบันทึกประวัติความปลอดภัย Audit Logs | Server Owner / Leader |
| **Admin** | `/setup-music` | ติดตั้งห้องขอเพลงประจำเซิร์ฟเวอร์พร้อมแผงควบคุมถาวร | Administrator |
| **Admin** | `/send-verify` | ส่งแผงยืนยันตัวตน CAPTCHA Modal | Administrator |
| **Admin** | `/send-ticket` | ส่งแผงเปิดทิกเก็ตแจ้งปัญหาและติดต่อทีมงาน | Administrator |
| **Admin** | `/announce` | ส่งข้อความประกาศทางการพร้อมสีและรูปภาพ | Manage Messages |
| **Moderation**| `/lockdown` | ระบบล็อกดาวน์เซิร์ฟเวอร์ฉุกเฉิน (เปิด/ปิด) | Manage Channels |
| **Moderation**| `/ban` | แบนสมาชิกออกจากเซิร์ฟเวอร์ | Ban Members |
| **Moderation**| `/unban` | ปลดแบนสมาชิก | Ban Members |
| **Moderation**| `/kick` | เตะสมาชิกออกจากเซิร์ฟเวอร์ | Kick Members |
| **Moderation**| `/timeout` | ปิดการส่งข้อความของสมาชิกชั่วคราว | Moderate Members |
| **Moderation**| `/untimeout`| ยกเลิกการปิดแชทชั่วคราว | Moderate Members |
| **Moderation**| `/clear` | ลบข้อความจำนวนมากในช่อง (1-100) | Manage Messages |
| **Moderation**| `/serverinfo` | แสดงข้อมูลสถิติของเซิร์ฟเวอร์ | ทุกคน |
| **Moderation**| `/userinfo` | แสดงข้อมูลส่วนตัวและยศของสมาชิก | ทุกคน |
| **Music** | `/play` | ค้นหาและเล่นเพลงจาก YouTube, Spotify, SoundCloud | ทุกคน |
| **Music** | `/skip` | ข้ามไปยังเพลงถัดไปในคิว | ทุกคน |
| **Music** | `/pause` | พักการเล่นเพลงชั่วคราว | ทุกคน |
| **Music** | `/resume` | เล่นเพลงต่อจากที่พักไว้ | ทุกคน |
| **Music** | `/stop` | หยุดเล่นเพลง ล้างคิว และออกจากห้องเสียง | ทุกคน |
| **Music** | `/queue` | แสดงรายชื่อเพลงที่รอเล่นในคิว | ทุกคน |
| **Music** | `/volume` | ปรับระดับเสียงเพลง (1 - 100%) | ทุกคน |
| **Music** | `/loop` | สลับโหมดวนซ้ำเพลง | ทุกคน |
| **General** | `/poll` | สร้างโพลสำรวจความคิดเห็นแบบเรียลไทม์ | ทุกคน |
| **General** | `/ping` | เช็คค่า Latency และสถานะของบอท | ทุกคน |
| **Fun** | `/8ball` | ลูกแก้วพยากรณ์คำตอบ | ทุกคน |
| **Fun** | `/coinflip` | สุ่มโยนเหรียญหัวหรือก้อย | ทุกคน |
| **Fun** | `/dice` | ทอยลูกเต๋า 6 หน้า | ทุกคน |
| **Fun** | `/fortune` | เสี่ยงเซียมซีทำนายดวงประจำวัน | ทุกคน |
| **Fun** | `/hug` | ส่งการ์ดกอดมอบกำลังใจให้เพื่อน | ทุกคน |
| **Fun** | `/joke` | สุ่มเล่ามุกตลกคลายเครียด | ทุกคน |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
uryu_bot/
├── .env                      # ไฟล์ตัวแปรสภาพแวดล้อมจริง
├── .env.example              # ตัวอย่างการตั้งค่าตัวแปรสภาพแวดล้อม
├── .gitignore                # รายการไฟล์ที่ไม่ต้องนำขึ้น Git
├── package.json              # โมดูล Dependencies และ Scripts
├── README.md                 # เอกสารคู่มือการใช้งานบอท
├── deploy-commands.js        # สคริปต์ลงทะเบียน 32 Slash Commands
└── src/
    ├── index.js              # จุดเริ่มต้นบอท Client Initialization
    ├── config/
    │   └── config.js         # การตั้งค่าระบบ ธีมสี และข้อความ
    ├── handlers/
    │   ├── commandHandler.js # ตัวโหลด Slash Commands อัตโนมัติ
    │   ├── eventHandler.js   # ตัวโหลด Event Listeners อัตโนมัติ
    │   └── componentHandler.js # ตัวจัดการ Button & Modal Interactivity
    ├── events/
    │   ├── client/
    │   │   └── ready.js      # แจ้งเตือนเมื่อบอทออนไลน์และตั้ง Streaming Presence
    │   ├── guild/
    │   │   ├── guildMemberAdd.js    # ระบบต้อนรับสมาชิกใหม่
    │   │   ├── guildMemberRemove.js # ระบบบอกลาสมาชิก
    │   │   ├── guildMemberUpdate.js # บันทึก Log การ Timeout และเปลี่ยนยศ
    │   │   ├── guildBanAdd.js       # บันทึก Log สมาชิกโดนแบน
    │   │   └── guildBanRemove.js    # บันทึก Log สมาชิกถูกปลดแบน
    │   ├── messages/
    │   │   ├── messageCreate.js     # ตรวจจับข้อความในห้องขอเพลงอัตโนมัติ
    │   │   ├── messageDelete.js     # บันทึก Log ข้อความถูกลบ
    │   │   └── messageUpdate.js     # บันทึก Log ข้อความถูกแก้ไข
    │   └── interactions/
    │       └── interactionCreate.js # ประมวลผลคำสั่งและการคลิกปุ่ม
    ├── commands/
    │   ├── admin/            # คำสั่งตั้งค่าเซิร์ฟเวอร์ (/setup-*, /announce, /send-*)
    │   ├── moderation/       # คำสั่งผู้ดูแล (/lockdown, /ban, /kick, /timeout, /clear...)
    │   ├── music/            # คำสั่งเล่นเพลง (/play, /skip, /queue, /volume...)
    │   ├── general/          # คำสั่งทั่วไป (/poll, /ping)
    │   └── fun/              # คำสั่งบันเทิง (/8ball, /dice, /fortune, /joke...)
    ├── components/
    │   ├── buttons/
    │   │   ├── verifyButton.js      # ปุ่มยืนยันตัวตน
    │   │   ├── ticketOpen.js        # ปุ่มเปิดทิกเก็ต
    │   │   ├── ticketClose.js       # ปุ่มปิดทิกเก็ต & สร้าง HTML Transcript
    │   │   ├── pollVote.js          # ปุ่มโหวตโพลสำรวจความคิดเห็น
    │   │   └── musicButtons.js      # ปุ่มควบคุมแผงเครื่องเล่นเพลง
    │   └── modals/
    │       └── verifyModal.js       # โมดอลกรอกรหัส CAPTCHA
    └── utils/
        ├── logger.js         # ระบบ Log ใน Console แบบมี Timestamp
        ├── captcha.js        # ตัวสุ่มรหัส CAPTCHA ป้องกันบอท
        ├── embeds.js         # แม่แบบสร้าง Embed สวยหรู
        ├── permissions.js    # ระบบตรวจสอบสิทธิ์และ Role Hierarchy
        ├── auditLogger.js    # ฟังก์ชันส่งบันทึกกิจกรรม Mod Action Logs
        ├── transcript.js     # ตัวสร้าง HTML Transcript Discord Dark Theme
        ├── pollStore.js      # จัดเก็บผลโหวตและสร้าง Progress Bar
        └── musicManager.js   # DisTube Engine, แผงควบคุมเพลง และ Extractor Plugins
```

---

## ⚙️ ขั้นตอนการติดตั้งและการเปิดใช้งาน (Setup Guide)

### 1. ติดตั้ง Node.js
ตรวจสอบว่าเครื่องของคุณติดตั้ง Node.js v18.x, v20.x หรือ v22+ LTS:
```bash
node -v
```

### 2. ติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:
```bash
npm install
```

### 3. ตั้งค่าไฟล์สภาพแวดล้อม (.env)
คัดลอกไฟล์ `.env.example` เป็น `.env` และกรอกข้อมูลให้ครบถ้วน:
```env
# Token และ App ID จาก Discord Developer Portal
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
CLIENT_ID=YOUR_CLIENT_ID_HERE
GUILD_ID=YOUR_GUILD_ID_HERE

# ID ยศต่างๆ ในเซิร์ฟเวอร์
VERIFIED_ROLE_ID=
LEADER_ROLE_ID=
ADMIN_ROLE_ID=
MODERATOR_ROLE_ID=

# ช่องแจ้งเตือนและระบบต่างๆ
WELCOME_CHANNEL_ID=
GOODBYE_CHANNEL_ID=
ENABLE_WELCOME_SYSTEM=true

LOG_CHANNEL_ID=
ENABLE_LOG_SYSTEM=true

TICKET_CATEGORY_ID=
MUSIC_CHANNEL_ID=
```

### 4. ลงทะเบียน Slash Commands ทั้งหมด (32 คำสั่ง)
รันคำสั่งลงทะเบียนคำสั่งเข้าสู่ Discord API:
```bash
npm run deploy
```

### 5. เริ่มต้นรันบอท
รันบอทเพื่อพร้อมให้บริการในเซิร์ฟเวอร์:
```bash
npm start
```

---

## 🛡️ การตั้งค่าสิทธิ์ใน Discord Developer Portal

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications) -> เลือก Application ของคุณ
2. เมนู **Bot** -> หัวข้อ **Privileged Gateway Intents**:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent** *(จำเป็นสำหรับการจัดการยศและระบบต้อนรับ)*
   - ✅ **Message Content Intent** *(จำเป็นสำหรับระบบขอเพลงและการตรวจจับข้อความ)*
3. **Role Hierarchy ใน Discord Server**:
   - ลากยศของ **บอท** ให้อยู่ **สูงกว่า** ยศของสมาชิกทั่วไป เพื่อให้สามารถมอบยศและแบน/เตะได้

---

## 📝 License
MIT License
