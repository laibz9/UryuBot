/**
 * @file src/utils/userResolver.js
 * @description ยูทิลิตี้สำหรับค้นหาและ Resolve ข้อมูล User และ Member จาก Interaction อย่างแม่นยำ 100%
 */

/**
 * ค้นหา User Object จาก Interaction แม้ไม่ได้อยู่ใน Cache หรือส่งเป็น Snowflake ID/Mention
 * @param {object} interaction - CommandInteraction
 * @param {string} optionName - ชื่อของ Option (ค่าเริ่มต้น 'user')
 * @returns {Promise<object|null>} Discord User Object หรือ null
 */
async function resolveTargetUser(interaction, optionName = 'user') {
  if (!interaction || !interaction.options) return null;

  // 1. ลองดึงจาก getUser โดยตรง
  let user = interaction.options.getUser(optionName) ||
             interaction.options.getUser('target') ||
             interaction.options.getUser('member');
  if (user) return user;

  // 2. ลองดึงจาก getMember
  const member = interaction.options.getMember(optionName) ||
                 interaction.options.getMember('target') ||
                 interaction.options.getMember('member');
  if (member?.user) return member.user;

  // 3. ค้นหาจาก interaction.options.data
  if (Array.isArray(interaction.options.data)) {
    const userOption = interaction.options.data.find(opt =>
      opt.name === optionName || opt.name === 'target' || opt.name === 'member' || opt.type === 6 || opt.type === 9
    );

    if (userOption) {
      if (userOption.user) return userOption.user;
      if (userOption.member?.user) return userOption.member.user;
      if (userOption.value) {
        const cleanId = String(userOption.value).replace(/[^0-9]/g, '');
        if (cleanId) {
          user = await interaction.client.users.fetch(cleanId).catch(() => null);
          if (user) return user;
        }
      }
    }

    // วนลูปตรวจสอบทุก Option ที่ส่งมาเผื่อระบุเป็น String User ID / Mention
    for (const opt of interaction.options.data) {
      if (opt.value) {
        const cleanId = String(opt.value).replace(/[^0-9]/g, '');
        if (cleanId.length >= 17 && cleanId.length <= 20) {
          user = await interaction.client.users.fetch(cleanId).catch(() => null);
          if (user) return user;
        }
      }
    }
  }

  return null;
}

/**
 * ค้นหา GuildMember Object จาก Interaction และ User
 * @param {object} interaction - CommandInteraction
 * @param {object} user - Discord User Object
 * @param {string} optionName - ชื่อของ Option
 * @returns {Promise<object|null>} Discord GuildMember Object หรือ null
 */
async function resolveTargetMember(interaction, user, optionName = 'user') {
  if (!interaction || !interaction.guild) return null;

  // 1. ลองดึงจาก getMember
  const optMember = interaction.options.getMember(optionName) ||
                    interaction.options.getMember('target') ||
                    interaction.options.getMember('member');
  if (optMember) return optMember;

  // 2. Fetch ตรงจาก Guild
  if (user && user.id) {
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) return member;
  }

  return null;
}

module.exports = {
  resolveTargetUser,
  resolveTargetMember
};
