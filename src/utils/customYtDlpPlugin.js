/**
 * @file src/utils/customYtDlpPlugin.js
 * @description Custom Resilient DisTube Plugin using yt-dlp to bypass YouTube format and warning blocks
 */

const { PlayableExtractorPlugin, Song, Playlist, DisTubeError } = require('distube');
const { spawn } = require('child_process');

function runYtDlp(urlOrQuery, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'yt-dlp' : (require('fs').existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp');

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--skip-download',
      '--prefer-free-formats',
      '--format', 'ba/ba*',
      ...extraArgs,
      urlOrQuery
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
    return true; // Handle all web urls and search queries
  }

  async resolve(url, options = {}) {
    let target = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      target = `ytsearch1:${url}`;
    }

    const info = await runYtDlp(target);

    if (info._type === 'playlist' || Array.isArray(info.entries)) {
      const entries = (info.entries || []).filter(Boolean);
      if (entries.length === 0) throw new DisTubeError('YTDLP_EMPTY_PLAYLIST', 'No tracks found in playlist');
      
      // If it's a search result with 1 item
      if (target.startsWith('ytsearch1:') && entries[0]) {
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
    const info = await runYtDlp(song.url);
    if (!info.url) throw new DisTubeError('YTDLP_NO_STREAM_URL', 'Failed to retrieve audio stream URL');
    return info.url;
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
