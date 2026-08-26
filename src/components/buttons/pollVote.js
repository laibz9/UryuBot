/**
 * @file src/components/buttons/pollVote.js
 * @description Button Handler เมื่อมีคนกดโหวตตัวเลือกในโพล (customId: poll_vote_*)
 */

const { MessageFlags } = require('discord.js');
const { getPoll, castVote, renderPollEmbed, createPoll } = require('../../utils/pollStore');
const logger = require('../../utils/logger');

// เก็บประวัติเวลาการโหวตล่าสุดของผู้ใช้ (userId -> timestamp)
const voteCooldowns = new Map();
const COOLDOWN_MS = 10000; // 10 วินาที

module.exports = {
  customId: 'poll_vote',

  /**
   * ประมวลผลเมื่อสมาชิกกดปุ่มโหวต
   * @param {object} interaction - ButtonInteraction Object
   */
  async execute(interaction) {
    try {
      const messageId = interaction.message.id;
      const userId = interaction.user.id;
      const guild = interaction.guild;
      const now = Date.now();

      // 0. ตรวจสอบ Cooldown เพื่อป้องกันการสแปมยิง Discord API
      const lastVoteTime = voteCooldowns.get(userId) || 0;
      if (now - lastVoteTime < COOLDOWN_MS) {
        const remainingSeconds = ((COOLDOWN_MS - (now - lastVoteTime)) / 1000).toFixed(1);
        return await interaction.reply({
          content: `⏳ กรุณารอสักครู่ (${remainingSeconds} วินาที) ก่อนกดโหวตหรือเปลี่ยนตัวเลือกใหม่อีกครั้งครับ`,
          flags: MessageFlags.Ephemeral
        });
      }

      // สกัด optionIndex จาก customId เช่น poll_vote_1 -> 1
      const parts = interaction.customId.split('_');
      const optionIndex = parseInt(parts[parts.length - 1], 10);

      if (isNaN(optionIndex)) {
        return await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการระบุตัวเลือก',
          flags: MessageFlags.Ephemeral
        });
      }

      let poll = getPoll(messageId);

      // กู้คืนข้อมูลโพลอัตโนมัติหากบอทเพิ่งรีสตาร์ท (Auto-Recovery from Embed)
      if (!poll && interaction.message.embeds.length > 0) {
        const embed = interaction.message.embeds[0];
        const desc = embed.description || '';
        const lines = desc.split('\n');
        const questionLine = lines.find(l => l.startsWith('### ❓ '));
        const question = questionLine ? questionLine.replace('### ❓ ', '') : 'แบบสำรวจความคิดเห็น';

        // ดึงปุ่มตัวเลือกจาก Message Components
        const options = [];
        if (interaction.message.components.length > 0) {
          interaction.message.components[0].components.forEach(btn => {
            options.push(btn.label || 'ตัวเลือก');
          });
        }

        if (options.length > 0) {
          createPoll(messageId, {
            question,
            options,
            authorId: interaction.client.user.id,
            authorTag: embed.footer?.text || 'Community Poll',
            authorAvatar: embed.footer?.iconURL || interaction.client.user.displayAvatarURL(),
            createdAt: embed.timestamp ? new Date(embed.timestamp).getTime() : Date.now()
          });
          poll = getPoll(messageId);
        }
      }

      if (!poll) {
        return await interaction.reply({
          content: 'ไม่พบข้อมูลของโพลนี้ หรือโพลนี้หมดอายุแล้ว',
          flags: MessageFlags.Ephemeral
        });
      }

      // ดำเนินการลงคะแนนโหวต
      const voteResult = castVote(messageId, userId, optionIndex);

      if (!voteResult) {
        return await interaction.reply({
          content: 'ไม่สามารถบันทึกการโหวตได้ กรุณาลองใหม่อีกครั้ง',
          flags: MessageFlags.Ephemeral
        });
      }

      // บันทึกเวลา Cooldown
      voteCooldowns.set(userId, now);

      // อัปเดต Embed ข้อความโพลแบบ Realtime
      const updatedEmbed = renderPollEmbed(poll, guild);
      await interaction.message.edit({ embeds: [updatedEmbed] });

      logger.info(`ผู้ใช้ ${interaction.user.tag} โหวตตัวเลือก "${voteResult.optionText}" ในโพล #${messageId}`);

      const responseText = voteResult.isChanged
        ? `🔄 คุณได้เปลี่ยนคะแนนโหวตเป็น: **"${voteResult.optionText}"** เรียบร้อยแล้ว`
        : `✅ คุณได้โหวต: **"${voteResult.optionText}"** เรียบร้อยแล้ว`;

      await interaction.reply({
        content: responseText,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดในการประมวลผลการโหวตโพล:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการบันทึกการโหวต',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
