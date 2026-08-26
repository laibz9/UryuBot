/**
 * @file src/components/buttons/musicButtons.js
 * @description Button Handler จัดการปุ่มกดควบคุมเพลงบนหน้าแผง Music Player (customId: music_*)
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { updateDedicatedMusicPanel } = require('../../utils/musicManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'music_',

  /**
   * ประมวลผลเมื่อสมาชิกกดปุ่มบนแผงควบคุมเพลง
   * @param {object} interaction - ButtonInteraction Object
   */
  async execute(interaction) {
    try {
      const customId = interaction.customId;
      const guild = interaction.guild;
      const member = interaction.member;
      const queue = interaction.client.distube.getQueue(guild.id);

      // ตรวจสอบว่ามีคิวเพลงหรือไม่
      if (!queue || !queue.songs || queue.songs.length === 0) {
        return await interaction.reply({
          content: '❌ ขณะนี้ไม่มีเพลงที่กำลังเล่นอยู่ครับ',
          flags: MessageFlags.Ephemeral
        });
      }

      // ตรวจสอบห้องเสียงของผู้กดปุ่ม
      const memberVoice = member?.voice?.channel;
      if (!memberVoice || (queue.voiceChannel && memberVoice.id !== queue.voiceChannel.id)) {
        return await interaction.reply({
          content: '❌ คุณต้องอยู่ในห้องเสียงเดียวกับบอทเพื่อกดควบคุมเพลงครับ',
          flags: MessageFlags.Ephemeral
        });
      }

      // ประมวลผลตามปุ่มที่กด
      switch (customId) {
        case 'music_play_pause': {
          if (queue.paused) {
            queue.resume();
            await interaction.reply({ content: '▶️ เล่นเพลงต่อเรียบร้อย', flags: MessageFlags.Ephemeral });
          } else {
            queue.pause();
            await interaction.reply({ content: '⏸️ พักการเล่นเพลงชั่วคราว', flags: MessageFlags.Ephemeral });
          }
          updateDedicatedMusicPanel(guild, queue, queue.songs[0]);
          break;
        }

        case 'music_skip': {
          if (queue.songs.length <= 1 && !queue.autoplay) {
            await queue.stop();
            updateDedicatedMusicPanel(guild, null, null);
            return await interaction.reply({ content: '⏹️ ข้ามเพลงสุดท้ายและหยุดเล่นเรียบร้อย', flags: MessageFlags.Ephemeral });
          }
          const nextSong = await queue.skip();
          await interaction.reply({ content: `⏭️ ข้ามเพลงเรียบร้อย! เพลงถัดไป: **${nextSong.name}**`, flags: MessageFlags.Ephemeral });
          break;
        }

        case 'music_previous': {
          try {
            await queue.previous();
            await interaction.reply({ content: '⏮️ เล่นเพลงก่อนหน้าเรียบร้อย', flags: MessageFlags.Ephemeral });
          } catch {
            await interaction.reply({ content: '⚠️ ไม่มีประวัติเพลงก่อนหน้าในคิวครับ', flags: MessageFlags.Ephemeral });
          }
          break;
        }

        case 'music_stop': {
          await queue.stop();
          updateDedicatedMusicPanel(guild, null, null);
          await interaction.reply({ content: '⏹️ หยุดเล่นเพลง ล้างคิว และออกจากห้องเสียงเรียบร้อย', flags: MessageFlags.Ephemeral });
          break;
        }

        case 'music_vol_down': {
          const currentVol = queue.volume || 100;
          const newVol = Math.max(currentVol - 10, 1);
          queue.setVolume(newVol);
          updateDedicatedMusicPanel(guild, queue, queue.songs[0]);
          await interaction.reply({ content: `🔉 ปรับลดระดับเสียงเป็น: **${newVol}%**`, flags: MessageFlags.Ephemeral });
          break;
        }

        case 'music_vol_up': {
          const currentVol = queue.volume || 100;
          const newVol = Math.min(currentVol + 10, 100);
          queue.setVolume(newVol);
          updateDedicatedMusicPanel(guild, queue, queue.songs[0]);
          await interaction.reply({ content: `🔊 ปรับเพิ่มระดับเสียงเป็น: **${newVol}%**`, flags: MessageFlags.Ephemeral });
          break;
        }

        case 'music_loop': {
          // สลับโหมด 0 -> 1 -> 2 -> 0
          const nextMode = (queue.repeatMode + 1) % 3;
          queue.setRepeatMode(nextMode);
          const modeNames = ['❌ ปิดการวนซ้ำ', '🔂 วนซ้ำเพลงนี้', '🔁 วนซ้ำทั้งคิว'];
          updateDedicatedMusicPanel(guild, queue, queue.songs[0]);
          await interaction.reply({ content: `🔁 โหมดวนซ้ำ: **${modeNames[nextMode]}**`, flags: MessageFlags.Ephemeral });
          break;
        }

        case 'music_queue': {
          const currentSong = queue.songs[0];
          const upcomingSongs = queue.songs.slice(1, 6);

          let desc = `🎶 **กำลังเล่นอยู่:**\n**[${currentSong.name}](${currentSong.url})** (\`${currentSong.formattedDuration}\`)\n\n` +
                     `📋 **คิวถัดไป (${queue.songs.length - 1} เพลง):**\n`;

          if (upcomingSongs.length === 0) {
            desc += `*ไม่มีเพลงรอในคิว*`;
          } else {
            upcomingSongs.forEach((s, i) => {
              desc += `\`${i + 1}.\` **[${s.name.slice(0, 45)}](${s.url})** (\`${s.formattedDuration}\`)\n`;
            });
          }

          const qEmbed = new EmbedBuilder()
            .setTitle('📜 รายการคิวเพลงปัจจุบัน')
            .setDescription(desc)
            .setColor(config.colors.accent)
            .setFooter({ text: `ระดับเสียง: ${queue.volume}% | โหมดวนซ้ำ: ${queue.repeatMode}` });

          await interaction.reply({ embeds: [qEmbed], flags: MessageFlags.Ephemeral });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      logger.error('เกิดข้อผิดพลาดขณะประมวลผล Music Button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'เกิดข้อผิดพลาดในการควบคุมเพลง กรุณาลองใหม่อีกครั้ง',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
