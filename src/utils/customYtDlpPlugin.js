/**
 * @file src/utils/customYtDlpPlugin.js
 * @description Custom Resilient DisTube Extractor Plugin using yt-dlp to bypass YouTube format and warning blocks
 */

const { ExtractorPlugin, Song, Playlist, DisTubeError } = require('distube');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getYtDlpPath() {
  if (process.platform === 'win32') {
    const localExe = path.resolve(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp.exe');
    if (fs.existsSync(localExe)) return localExe;
    return 'yt-dlp';
  }
  if (fs.existsSync('/usr/local/bin/yt-dlp')) return '/usr/local/bin/yt-dlp';
  if (fs.existsSync('/usr/bin/yt-dlp')) return '/usr/bin/yt-dlp';
  return 'yt-dlp';
}

function getBestAudioStreamUrl(info) {
  if (!info) return null;
  if (info.url && !info.url.includes('youtube.com/watch') && !info.url.includes('youtu.be/')) {
    return info.url;
  }
  const formats = info.formats || [];
  const audioFormat = formats
    .filter(f => f.acodec !== 'none' && f.url)
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
  return audioFormat ? audioFormat.url : (info.url || null);
}

function runYtDlp(target) {
  return new Promise((resolve, reject) => {
    const command = getYtDlpPath();

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--skip-download',
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
      reject(new DisTubeError('YTDLP_SPAWN_ERROR', `Cannot spawn yt-dlp (${command}): ${err.message}`));
    });
  });
}

class CustomYtDlpPlugin extends ExtractorPlugin {
  validate(url) {
    if (typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async resolve(url, options = {}) {
    const info = await runYtDlp(url);

    if (info._type === 'playlist' || Array.isArray(info.entries)) {
      const entries = (info.entries || []).filter(Boolean);
      if (entries.length === 0) {
        throw new DisTubeError('YTDLP_EMPTY_PLAYLIST', 'ไม่พบเพลงในเพลย์ลิสต์');
      }

      if (entries.length === 1) {
        const s = new Song(this.mapSongInfo(entries[0]), options);
        const streamUrl = getBestAudioStreamUrl(entries[0]);
        s.streamURL = streamUrl;
        if (s.stream) s.stream.url = streamUrl;
        return s;
      }

      return new Playlist(
        {
          source: info.extractor || 'youtube',
          songs: entries.map(item => {
            const s = new Song(this.mapSongInfo(item), options);
            const streamUrl = getBestAudioStreamUrl(item);
            s.streamURL = streamUrl;
            if (s.stream) s.stream.url = streamUrl;
            return s;
          }),
          id: info.id ? info.id.toString() : 'playlist',
          name: info.title || 'Playlist',
          url: info.webpage_url || url,
          thumbnail: info.thumbnails?.[0]?.url
        },
        options
      );
    }

    const song = new Song(this.mapSongInfo(info), options);
    const streamUrl = getBestAudioStreamUrl(info);
    song.streamURL = streamUrl;
    if (song.stream) song.stream.url = streamUrl;
    return song;
  }

  async searchSong(query, options = {}) {
    const data = await runYtDlp('ytsearch1:' + query);
    const item = (data.entries && data.entries[0]) ? data.entries[0] : data;
    if (!item || (!item.title && !item.fulltitle)) return null;

    const song = new Song(this.mapSongInfo(item), options);
    const streamUrl = getBestAudioStreamUrl(item);
    song.streamURL = streamUrl;
    if (song.stream) song.stream.url = streamUrl;
    return song;
  }

  async search(query, options = {}) {
    const data = await runYtDlp('ytsearch10:' + query);
    const entries = (data.entries || []).filter(Boolean);
    return entries.map(item => {
      const s = new Song(this.mapSongInfo(item), options);
      const streamUrl = getBestAudioStreamUrl(item);
      s.streamURL = streamUrl;
      if (s.stream) s.stream.url = streamUrl;
      return s;
    });
  }

  async getStreamURL(song) {
    if (song.stream?.url) return song.stream.url;
    if (song.streamURL) return song.streamURL;
    if (!song.url) throw new DisTubeError('YTDLP_INVALID_SONG', 'Song URL is missing');
    const info = await runYtDlp(song.url);
    const streamUrl = getBestAudioStreamUrl(info);
    if (!streamUrl) throw new DisTubeError('YTDLP_NO_STREAM_URL', 'Failed to retrieve audio stream URL');
    song.streamURL = streamUrl;
    if (song.stream) song.stream.url = streamUrl;
    return streamUrl;
  }

  mapSongInfo(info) {
    return {
      plugin: this,
      source: info.extractor || 'youtube',
      playFromSource: true,
      id: info.id,
      name: info.title || info.fulltitle || 'Unknown Song',
      url: info.webpage_url || info.original_url || info.url || `https://youtu.be/${info.id}`,
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
