/**
 * @file src/utils/customYtDlpPlugin.js
 * @description Custom Resilient DisTube Plugin using yt-dlp to bypass YouTube format and warning blocks
 */

const { PlayableExtractorPlugin, Song, Playlist, DisTubeError } = require('distube');
const { spawn } = require('child_process');

function runYtDlpExtract(queryOrUrl) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'yt-dlp' : (require('fs').existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp');

    let target = queryOrUrl;
    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('ytsearch')) {
      target = `ytsearch1:${queryOrUrl}`;
    }

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--skip-download',
      '--prefer-free-formats',
      '--format', 'ba/ba*',
      target
    ];

    const proc = spawn(command, args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      stdout += chunk;
    });

    proc.stderr.on('data', chunk => {
      stderr += chunk;
    });

    proc.on('close', code => {
      if (code === 0) {
        try {
          const firstBrace = stdout.indexOf('{');
          const cleanOutput = firstBrace !== -1 ? stdout.slice(firstBrace) : stdout;
          const data = JSON.parse(cleanOutput);
          resolve(data);
        } catch (err) {
          reject(new DisTubeError('YTDLP_PARSE_ERROR', `JSON Parse failed: ${err.message}`));
        }
      } else {
        reject(new DisTubeError('YTDLP_EXEC_ERROR', stderr || stdout));
      }
    });

    proc.on('error', (err) => {
      reject(new DisTubeError('YTDLP_SPAWN_ERROR', `Cannot spawn yt-dlp: ${err.message}`));
    });
  });
}

class CustomYtDlpPlugin extends PlayableExtractorPlugin {
  validate(url) {
    if (typeof url !== 'string') return false;
    return true;
  }

  async resolve(url, options = {}) {
    const info = await runYtDlpExtract(url);

    if (info._type === 'playlist' || Array.isArray(info.entries)) {
      const entries = (info.entries || []).filter(Boolean);
      if (entries.length === 0) {
        throw new DisTubeError('YTDLP_EMPTY_PLAYLIST', 'ไม่พบเพลงที่ค้นหา');
      }

      // If search result or single track
      if (entries.length === 1 || url.startsWith('ytsearch') || !url.startsWith('http')) {
        return new Song(this.mapSongInfo(entries[0]), options);
      }

      return new Playlist(
        {
          source: info.extractor || 'youtube',
          songs: entries.map(item => new Song(this.mapSongInfo(item), options)),
          id: info.id ? info.id.toString() : 'playlist',
          name: info.title || 'Playlist',
          url: info.webpage_url || url,
          thumbnail: info.thumbnails?.[0]?.url
        },
        options
      );
    }

    return new Song(this.mapSongInfo(info), options);
  }

  async getStreamURL(song) {
    if (!song.url) throw new DisTubeError('YTDLP_INVALID_SONG', 'Song URL is missing');
    const info = await runYtDlpExtract(song.url);
    const streamUrl = info.url || (info.entries && info.entries[0] && info.entries[0].url);
    if (!streamUrl) throw new DisTubeError('YTDLP_NO_STREAM_URL', 'Failed to retrieve audio stream URL');
    return streamUrl;
  }

  mapSongInfo(info) {
    return {
      plugin: this,
      source: info.extractor || 'youtube',
      playFromSource: true,
      id: info.id,
      name: info.title || info.fulltitle || 'Unknown Song',
      url: info.webpage_url || info.original_url || `https://youtu.be/${info.id}`,
      isLive: Boolean(info.is_live),
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
      duration: info.is_live ? 0 : (info.duration || 0),
      uploader: {
        name: info.uploader || info.channel || 'Artist',
        url: info.uploader_url || info.channel_url
      },
      views: info.view_count || 0,
      likes: info.like_count || 0
    };
  }

  getRelatedSongs() {
    return [];
  }
}

module.exports = { CustomYtDlpPlugin };
