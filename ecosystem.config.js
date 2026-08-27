/**
 * @file ecosystem.config.js
 * @description การตั้งค่า PM2 Process Manager สำหรับรัน UryuBot 24/7 บน Linux Cloud Server
 */

module.exports = {
  apps: [
    {
      name: 'uryubot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
