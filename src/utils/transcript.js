/**
 * @file src/utils/transcript.js
 * @description ยูทิลิตี้สร้างไฟล์ HTML Transcript ประวัติการสนทนาในห้อง Ticket สไตล์ Discord Dark Theme
 */

const { AttachmentBuilder } = require('discord.js');

/**
 * แปลงอักขระพิเศษสำหรับ HTML เพื่อความปลอดภัย (XSS Protection)
 * @param {string} str - ข้อความ
 * @returns {string} ข้อความที่ผ่านการ escape แล้ว
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * แปลง Discord Markdown เบื้องต้นให้เป็น HTML
 * @param {string} content - เนื้อหาข้อความ Discord
 * @returns {string} HTML Content
 */
function formatDiscordMarkdown(content) {
  if (!content) return '';
  let text = escapeHtml(content);

  // Code blocks: ```js code ```
  text = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');

  // Bold: **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers: ### Header
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Quotes: > quote
  text = text.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Line breaks
  text = text.replace(/\n/g, '<br>');

  return text;
}

/**
 * สร้างไฟล์ Attachment HTML Transcript จากรายการข้อความ
 * @param {object} channel - Discord GuildTextChannel
 * @param {Array<object>} messages - รายการ Message Object (เรียงจากเก่าไปใหม่)
 * @param {object} opener - ผู้เปิดตั๋ว (User / GuildMember)
 * @param {object} closer - ผู้ปิดตั๋ว (User / GuildMember)
 * @returns {AttachmentBuilder} Attachment Object พร้อมส่ง
 */
function generateHtmlTranscript(channel, messages, opener, closer) {
  const guild = channel.guild;
  const openerTag = opener ? (opener.tag || opener.user?.tag || opener.username || `${opener}`) : 'ไม่ทราบ';
  const closerTag = closer ? (closer.tag || closer.user?.tag || closer.username || `${closer}`) : 'ไม่ทราบ';
  const exportDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  let messageHtml = '';

  for (const msg of messages) {
    if (!msg.author) continue;

    const author = msg.author;
    const authorName = escapeHtml(author.displayName || author.username);
    const authorTag = escapeHtml(author.tag);
    const avatarUrl = author.displayAvatarURL({ dynamic: true, size: 128 });
    const isBot = author.bot ? '<span class="bot-badge">BOT</span>' : '';
    const timeStr = new Date(msg.createdTimestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.size > 0) {
      for (const [, att] of msg.attachments) {
        if (att.contentType && att.contentType.startsWith('image/')) {
          attachmentsHtml += `<div class="attachment"><a href="${att.url}" target="_blank"><img src="${att.url}" alt="Attachment" /></a></div>`;
        } else {
          attachmentsHtml += `<div class="attachment-file">📁 <a href="${att.url}" target="_blank">${escapeHtml(att.name)}</a></div>`;
        }
      }
    }

    let embedsHtml = '';
    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        const title = embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : '';
        const desc = embed.description ? `<div class="embed-desc">${formatDiscordMarkdown(embed.description)}</div>` : '';
        const color = embed.hexColor || '#5865F2';

        embedsHtml += `
          <div class="embed" style="border-left-color: ${color};">
            ${title}
            ${desc}
          </div>
        `;
      }
    }

    messageHtml += `
      <div class="message-group">
        <img class="avatar" src="${avatarUrl}" alt="${authorTag}" />
        <div class="message-content-wrapper">
          <div class="message-header">
            <span class="author-name">${authorName}</span>
            ${isBot}
            <span class="timestamp">${timeStr}</span>
          </div>
          <div class="message-body">${formatDiscordMarkdown(msg.content)}</div>
          ${attachmentsHtml}
          ${embedsHtml}
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Transcript - #${channel.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #313338;
      color: #DBDEE1;
      line-height: 1.5;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: #2B2D31;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .header {
      background: linear-gradient(135deg, #1E1F22, #2B2D31);
      padding: 24px;
      border-bottom: 2px solid #383A40;
    }
    .header h1 {
      color: #FFFFFF;
      font-size: 24px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
      font-size: 13px;
      color: #949BA4;
    }
    .meta-item strong { color: #F2F3F5; }
    .messages-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .message-group {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .message-group:hover { background-color: #2E3035; }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .message-content-wrapper { flex: 1; min-width: 0; }
    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .author-name {
      font-weight: 600;
      color: #F2F3F5;
      font-size: 15px;
    }
    .bot-badge {
      background-color: #5865F2;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .timestamp {
      font-size: 12px;
      color: #949BA4;
    }
    .message-body {
      color: #DBDEE1;
      font-size: 14px;
      word-wrap: break-word;
    }
    pre {
      background-color: #1E1F22;
      border: 1px solid #383A40;
      border-radius: 6px;
      padding: 10px;
      margin: 8px 0;
      overflow-x: auto;
      color: #E0E2E5;
      font-family: Consolas, monospace;
      font-size: 13px;
    }
    code.inline {
      background-color: #1E1F22;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: Consolas, monospace;
      font-size: 85%;
    }
    blockquote {
      border-left: 4px solid #4E5058;
      padding-left: 12px;
      margin: 6px 0;
      color: #B5BAC1;
    }
    .attachment {
      margin-top: 8px;
    }
    .attachment img {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
      border: 1px solid #383A40;
    }
    .attachment-file {
      margin-top: 6px;
      font-size: 13px;
    }
    .attachment-file a { color: #00A8FC; text-decoration: none; }
    .attachment-file a:hover { text-decoration: underline; }
    .embed {
      background-color: #2B2D31;
      border-left: 4px solid #5865F2;
      border-radius: 4px;
      padding: 12px 16px;
      margin-top: 8px;
      max-width: 520px;
      background: #1E1F22;
    }
    .embed-title { font-weight: 700; color: #FFFFFF; margin-bottom: 6px; }
    .embed-desc { font-size: 13px; color: #DBDEE1; }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      color: #949BA4;
      border-top: 1px solid #383A40;
      background-color: #1E1F22;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 ประวัติการสนทนา: #${escapeHtml(channel.name)}</h1>
      <div class="meta-grid">
        <div class="meta-item">เซิร์ฟเวอร์: <strong>${escapeHtml(guild.name)}</strong></div>
        <div class="meta-item">ผู้เปิดทิกเก็ต: <strong>${escapeHtml(openerTag)}</strong></div>
        <div class="meta-item">ผู้ปิดทิกเก็ต: <strong>${escapeHtml(closerTag)}</strong></div>
        <div class="meta-item">วันที่ส่งออก: <strong>${exportDate}</strong></div>
        <div class="meta-item">ข้อความทั้งหมด: <strong>${messages.length} ข้อความ</strong></div>
      </div>
    </div>
    <div class="messages-container">
      ${messageHtml || '<div style="text-align: center; color: #949BA4; padding: 20px;">ไม่มีประวัติข้อความ</div>'}
    </div>
    <div class="footer">
      Generated automatically by uryu_bot Ticket Support System
    </div>
  </div>
</body>
</html>`;

  const fileName = `transcript-${channel.name}-${Date.now()}.html`;
  return new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: fileName });
}

module.exports = {
  generateHtmlTranscript
};
