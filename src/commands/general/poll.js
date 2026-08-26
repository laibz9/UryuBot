/**
 * @file src/commands/general/poll.js
 * @description Slash Command สำหรับสร้างโพลสำรวจความคิดเห็นพร้อมปุ่มกดโหวตแบบเรียลไทม์ (/poll)
 */

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { createPoll, renderPollEmbed } = require('../../utils/pollStore');
const { createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

// Cooldown Map สำหรับสร้างโพล (userId -> timestamp)
const createPollCooldowns = new Map();
const CREATE_COOLDOWN_MS = 60000; // 60 วินาที

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('สร้างโพลสำรวจความคิดเห็นพร้อมปุ่มโหวตและเปอร์เซ็นต์สด')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('หัวข้อคำถามของแบบสำรวจ')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('option_1')
        .setDescription('ตัวเลือกที่ 1')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('option_2')
        .setDescription('ตัวเลือกที่ 2')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('option_3')
        .setDescription('ตัวเลือกที่ 3 (ไม่บังคับ)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('option_4')
        .setDescription('ตัวเลือกที่ 4 (ไม่บังคับ)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('option_5')
        .setDescription('ตัวเลือกที่ 5 (ไม่บังคับ)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('ช่องที่ต้องการส่งโพล (หากไม่ระบุจะส่งในช่องปัจจุบัน)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  /**
   * ประมวลผลคำสั่ง /poll
   * @param {object} interaction - CommandInteraction Object
   */
  async execute(interaction) {
    try {
      const user = interaction.user;
      const now = Date.now();

      // 0. ตรวจสอบ Cooldown การสร้างโพล 60 วินาที
      const lastCreateTime = createPollCooldowns.get(user.id) || 0;
      if (now - lastCreateTime < CREATE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((CREATE_COOLDOWN_MS - (now - lastCreateTime)) / 1000);
        return await interaction.reply({
          content: `⏳ คุณสามารถสร้างโพลใหม่ได้อีกครั้งในอีก **${remainingSeconds} วินาที** ครับ`,
          flags: MessageFlags.Ephemeral
        });
      }
      const question = interaction.options.getString('question');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const guild = interaction.guild;

      // รวบรวมตัวเลือก
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const opt = interaction.options.getString(`option_${i}`);
        if (opt) options.push(opt);
      }

      // ตรวจสอบสิทธิ์บอทในช่องเป้าหมาย
      const permissions = targetChannel.permissionsFor(guild.members.me);
      if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        const errEmbed = createErrorEmbed('สิทธิ์ไม่เพียงพอ', `บอทไม่มีสิทธิ์ส่งข้อความหรือ Embed ในช่อง ${targetChannel}`);
        return await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }

      // ข้อมูลโพลเริ่มต้น
      const pollData = {
        question,
        options: options.map(t => ({ text: t, votes: new Set() })),
        authorId: user.id,
        authorTag: user.tag,
        authorAvatar: user.displayAvatarURL({ dynamic: true }),
        createdAt: Date.now()
      };

      // สร้าง Embed เริ่มต้น
      const pollEmbed = renderPollEmbed(pollData, guild);

      // สร้างปุ่มกดโหวตสำหรับแต่ละตัวเลือก (customId: poll_vote_0, poll_vote_1, ...)
      const actionRow = new ActionRowBuilder();
      options.forEach((optText, index) => {
        const button = new ButtonBuilder()
          .setCustomId(`poll_vote_${index}`)
          .setLabel(optText.slice(0, 75))
          .setEmoji(emojiNumbers[index] || '🔹')
          .setStyle(ButtonStyle.Secondary);

        actionRow.addComponents(button);
      });

      // ส่งข้อความโพลไปยังช่อง
      const pollMessage = await targetChannel.send({
        embeds: [pollEmbed],
        components: [actionRow]
      });

      // บันทึกข้อมูลโพลเข้า Store โดยใช้ Message ID เป็น Key
      createPoll(pollMessage.id, {
        question,
        options,
        authorId: user.id,
        authorTag: user.tag,
        authorAvatar: user.displayAvatarURL({ dynamic: true }),
        createdAt: Date.now()
      });

      logger.info(`สร้างโพล "${question}" ในช่อง #${targetChannel.name} สำเร็จโดย ${user.tag}`);

      // บันทึกเวลา Cooldown 60 วินาที
      createPollCooldowns.set(user.id, now);

      await interaction.reply({
        content: `✅ สร้างโพลสำรวจความคิดเห็นในช่อง ${targetChannel} เรียบร้อยแล้วครับ`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะรันคำสั่ง /poll:', error);
      if (!interaction.replied && !interaction.deferred) {
        const errEmbed = createErrorEmbed('ข้อผิดพลาดระบบ', config.messages.genericError);
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};
