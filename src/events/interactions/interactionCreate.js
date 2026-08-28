/**
 * @file src/events/interactions/interactionCreate.js
 * @description Event Handler สำหรับดักจับทุก Interaction (Commands, Buttons, Modals) และส่งต่อไปยัง Handler ที่เหมาะสม
 */

const { Events, MessageFlags, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { getGuildSettings } = require('../../database/db');
const { handleButton, handleModal, handleSelectMenu } = require('../../handlers/componentHandler');

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  /**
   * ประมวลผลเมื่อเกิด Interaction ขึ้น
   * @param {object} interaction - Discord Interaction Object
   * @param {object} client - Instance ของ Discord Client
   */
  async execute(interaction, client) {
    try {
      // 1. จัดการ Slash Commands (ChatInputCommand)
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          logger.warn(`ไม่พบคำสั่ง Slash Command: /${interaction.commandName}`);
          return;
        }

        // ตรวจสอบการเปิด/ปิดหมวดหมู่คำสั่งตามการตั้งค่าของเซิร์ฟเวอร์
        if (interaction.guildId) {
          const settings = getGuildSettings(interaction.guildId);

          // ตรวจสอบหมวดหมู่ Admin
          if (command.category === 'admin' && settings.enableAdminCommands === false) {
            const disabledEmbed = new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('⚠️ คำสั่งหมวดหมู่ผู้ดูแลระบบถูกปิดใช้งาน')
              .setDescription(`คำสั่งในหมวดหมู่ **ผู้ดูแลระบบ (Admin Setup Commands)** ถูกปิดใช้งานสำหรับเซิร์ฟเวอร์นี้โดยเจ้าของเซิร์ฟเวอร์\n\n💡 *หากต้องการเปิดใช้งาน สามารถเปิดสวิตช์ได้ที่ Web Dashboard*`)
              .setFooter({ text: 'UryuBot • Module Guard' })
              .setTimestamp();

            return interaction.reply({ embeds: [disabledEmbed], flags: MessageFlags.Ephemeral });
          }

          // ตรวจสอบหมวดหมู่ Moderation (ดูแลความสงบ)
          if (command.category === 'moderation' && settings.enableModerationCommands === false) {
            const disabledEmbed = new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('⚠️ คำสั่งหมวดหมู่ดูแลความสงบถูกปิดใช้งาน')
              .setDescription(`คำสั่งในหมวดหมู่ **ดูแลความสงบ (Moderation Commands เช่น /ban, /kick, /timeout, /clear, /lockdown)** ถูกปิดใช้งานในเซิร์ฟเวอร์นี้โดยเจ้าของเซิร์ฟเวอร์ (เพื่อรองรับการใช้งานร่วมกับบอทความปลอดภัยอื่น เช่น Wick)\n\n💡 *หากต้องการเปิดใช้งาน สามารถเปิดสวิตช์ได้ที่ Web Dashboard*`)
              .setFooter({ text: 'UryuBot • Module Guard' })
              .setTimestamp();

            return interaction.reply({ embeds: [disabledEmbed], flags: MessageFlags.Ephemeral });
          }
        }

        try {
          await command.execute(interaction, client);
        } catch (error) {
          if (error.code === 10062 || error.code === 40060) {
            logger.warn(`Interaction /${interaction.commandName} expired or was already acknowledged (${error.code})`);
            return;
          }
          logger.error(`เกิดข้อผิดพลาดในการรันคำสั่ง /${interaction.commandName}:`, error);

          const errorMessage = {
            content: 'เกิดข้อผิดพลาดในการประมวลผลคำสั่งนี้ กรุณาลองใหม่อีกครั้ง',
            flags: MessageFlags.Ephemeral
          };

          try {
            if (interaction.replied || interaction.deferred) {
              await interaction.editReply(errorMessage).catch(async () => {
                await interaction.followUp(errorMessage).catch(() => {});
              });
            } else {
              await interaction.reply(errorMessage).catch(() => {});
            }
          } catch {}
        }
        return;
      }

      // 2. จัดการ Button Interaction
      if (interaction.isButton()) {
        await handleButton(interaction, client);
        return;
      }

      // 3. จัดการ Modal Submit Interaction
      if (interaction.isModalSubmit()) {
        await handleModal(interaction, client);
        return;
      }

      // 4. จัดการ Select Menu (Dropdown) Interaction
      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction, client);
        return;
      }
    } catch (globalError) {
      logger.error('เกิดข้อผิดพลาดไม่ทราบสาเหตุใน interactionCreate event:', globalError);
    }
  }
};
