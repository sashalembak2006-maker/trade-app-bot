/**
 * PM2 production process manager — run from repo root:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 */
const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'prime-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(root, 'logs/api-error.log'),
      out_file: path.join(root, 'logs/api-out.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'prime-bot',
      cwd: path.join(root, 'apps/bot'),
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(root, 'logs/bot-error.log'),
      out_file: path.join(root, 'logs/bot-out.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'prime-web',
      cwd: path.join(root, 'apps/web'),
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --host 0.0.0.0 --port 4173',
      instances: 1,
      autorestart: true,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(root, 'logs/web-error.log'),
      out_file: path.join(root, 'logs/web-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};

/** Optional collector — uncomment the block below OR start manually:
 *   pm2 start ecosystem.config.cjs --only prime-collector
 */
module.exports.apps.push({
  name: 'prime-collector',
  cwd: path.join(root, 'apps/collector'),
  script: 'dist/index.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '200M',
  env: {
    NODE_ENV: 'production',
  },
  error_file: path.join(root, 'logs/collector-error.log'),
  out_file: path.join(root, 'logs/collector-out.log'),
  merge_logs: true,
  time: true,
});
