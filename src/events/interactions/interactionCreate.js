/**
 * @file src/events/interactions/interactionCreate.js
 * @description Event Handler สำหรับดักจับทุก Interaction (Commands, Buttons, Modals) และส่งต่อไปยัง Handler ที่เหมาะสม
 */

const { Events, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');
const { handleButton, handleModal } = require('../../handlers/componentHandler');

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

        try {
          await command.execute(interaction, client);
        } catch (error) {
          logger.error(`เกิดข้อผิดพลาดในการรันคำสั่ง /${interaction.commandName}:`, error);

          // Defensive Check: ป้องกันการ reply ซ้ำเมื่อระบุข้อความตอบกลับ
          const errorMessage = {
            content: 'เกิดข้อผิดพลาดในการประมวลผลคำสั่งนี้ กรุณาลองใหม่อีกครั้ง',
            flags: MessageFlags.Ephemeral
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage).catch(() => {});
          } else {
            await interaction.reply(errorMessage).catch(() => {});
          }
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
    } catch (globalError) {
      logger.error('เกิดข้อผิดพลาดไม่ทราบสาเหตุใน interactionCreate event:', globalError);
    }
  }
};
