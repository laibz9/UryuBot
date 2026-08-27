/**
 * @file src/handlers/componentHandler.js
 * @description ตัวจัดการเส้นทางและโหลด Handlers สำหรับ Button, Modal, และ Select Menu Interactions
 */

const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

/**
 * โหลดไฟล์ Buttons, Modals และ SelectMenus ทั้งหมดเข้าสู่ Collections ของ Client
 * @param {object} client - Instance ของ Discord Client
 */
function loadComponents(client) {
  const buttonsPath = path.join(__dirname, '../components/buttons');
  const modalsPath = path.join(__dirname, '../components/modals');
  const selectMenusPath = path.join(__dirname, '../components/selectMenus');

  // โหลด Button Handlers
  if (fs.existsSync(buttonsPath)) {
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
    for (const file of buttonFiles) {
      const filePath = path.join(buttonsPath, file);
      const button = require(filePath);
      if (button && button.customId && typeof button.execute === 'function') {
        client.buttons.set(button.customId, button);
        if (button.customId === 'btn_open_ticket') {
          client.buttons.set('btn_ticket_open', button);
        }
        logger.info(`โหลด Button Handler: customId [${button.customId}] สำเร็จ`);
      }
    }
  }

  // โหลด Modal Handlers
  if (fs.existsSync(modalsPath)) {
    const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
    for (const file of modalFiles) {
      const filePath = path.join(modalsPath, file);
      const modal = require(filePath);
      if (modal && modal.customId && typeof modal.execute === 'function') {
        client.modals.set(modal.customId, modal);
        logger.info(`โหลด Modal Handler: customId [${modal.customId}] สำเร็จ`);
      }
    }
  }

  // โหลด SelectMenu Handlers
  if (fs.existsSync(selectMenusPath)) {
    const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
    for (const file of selectMenuFiles) {
      const filePath = path.join(selectMenusPath, file);
      const selectMenu = require(filePath);
      if (selectMenu && selectMenu.customId && typeof selectMenu.execute === 'function') {
        if (!client.selectMenus) client.selectMenus = new Map();
        client.selectMenus.set(selectMenu.customId, selectMenu);
        logger.info(`โหลด SelectMenu Handler: customId [${selectMenu.customId}] สำเร็จ`);
      }
    }
  }

  logger.success('โหลด Component Handlers (Buttons, Modals & SelectMenus) สำเร็จ');
}

/**
 * ประมวลผลและส่งต่อการกดปุ่ม (Button Interaction) ไปยัง Handler ที่ถูกต้อง
 * @param {object} interaction - Discord ButtonInteraction Object
 * @param {object} client - Instance ของ Discord Client
 */
async function handleButton(interaction, client) {
  let button = client.buttons.get(interaction.customId);

  // หากไม่พบแบบตรงตัว ให้ค้นหาแบบ prefix matching (เช่น poll_vote_0 แมตช์กับ poll_vote)
  if (!button) {
    for (const [key, val] of client.buttons) {
      if (interaction.customId.startsWith(key)) {
        button = val;
        break;
      }
    }
  }

  if (!button) {
    logger.warn(`ไม่พบ Button Handler สำหรับ customId: ${interaction.customId}`);
    return;
  }

  try {
    await button.execute(interaction, client);
  } catch (error) {
    logger.error(`เกิดข้อผิดพลาดขณะรัน Button Handler [${interaction.customId}]:`, error);
    
    // Defensive check เพื่อไม่ให้บอทค้าง
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'เกิดข้อผิดพลาดในการประมวลผลปุ่มนี้ กรุณาลองใหม่อีกครั้ง',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
}

/**
 * ประมวลผลและส่งต่อการส่ง Modal (ModalSubmit Interaction) ไปยัง Handler ที่ถูกต้อง
 * @param {object} interaction - Discord ModalSubmitInteraction Object
 * @param {object} client - Instance ของ Discord Client
 */
async function handleModal(interaction, client) {
  let modalKey = interaction.customId;
  if (modalKey.includes(':')) {
    modalKey = modalKey.split(':')[0];
  }

  const modal = client.modals.get(modalKey);

  if (!modal) {
    logger.warn(`ไม่พบ Modal Handler สำหรับ customId: ${interaction.customId} (Key: ${modalKey})`);
    return;
  }

  try {
    await modal.execute(interaction, client);
  } catch (error) {
    logger.error(`เกิดข้อผิดพลาดขณะรัน Modal Handler [${interaction.customId}]:`, error);

    // Defensive check เพื่อไม่ให้บอทค้าง
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'เกิดข้อผิดพลาดในการประมวลผล Modal นี้ กรุณาลองใหม่อีกครั้ง',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
}

/**
 * ประมวลผลและส่งต่อการเลือกตัวเลือกใน Select Menu (AnySelectMenuInteraction)
 * @param {object} interaction - Discord AnySelectMenuInteraction Object
 * @param {object} client - Instance ของ Discord Client
 */
async function handleSelectMenu(interaction, client) {
  let selectMenu = client.selectMenus?.get(interaction.customId);

  if (!selectMenu) {
    for (const [key, val] of client.selectMenus || []) {
      if (interaction.customId.startsWith(key)) {
        selectMenu = val;
        break;
      }
    }
  }

  if (!selectMenu) {
    logger.warn(`ไม่พบ SelectMenu Handler สำหรับ customId: ${interaction.customId}`);
    return;
  }

  try {
    await selectMenu.execute(interaction, client);
  } catch (error) {
    logger.error(`เกิดข้อผิดพลาดขณะรัน SelectMenu Handler [${interaction.customId}]:`, error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'เกิดข้อผิดพลาดในการประมวลผลเมนูนี้ กรุณาลองใหม่อีกครั้ง',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
}

module.exports = {
  loadComponents,
  handleButton,
  handleModal,
  handleSelectMenu
};
