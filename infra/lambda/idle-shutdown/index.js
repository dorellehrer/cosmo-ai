// Lambda function that calls the Nova idle-shutdown cron endpoint
const https = require('http');

exports.handler = async (event) => {
  const APP_URL = process.env.APP_URL;
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!APP_URL || !CRON_SECRET) {
    throw new Error('APP_URL and CRON_SECRET env vars are required');
  }

  const url = new URL('/api/agent/cron/idle-shutdown', APP_URL);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? require('https') : require('http');

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json',
          'Content-Length': 0,
        },
        timeout: 30000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          console.log(`Response ${res.statusCode}: ${body}`);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
};
