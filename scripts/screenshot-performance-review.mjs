import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist', 'public');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    // Collect body first, then forward
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const headers = { ...req.headers };
      headers.host = '127.0.0.1:3000';
      delete headers['upgrade'];
      delete headers['connection'];
      headers['connection'] = 'close';

      const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: 3000,
        path: req.url,
        method: req.method,
        headers,
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => {
        res.writeHead(502);
        res.end('Proxy error: ' + e.message);
      });
      if (body.length > 0) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  const urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!existsSync(filePath) || !path.extname(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  try {
    const data = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(4999, r));
console.log('SPA+proxy on :4999');

// Get JWT
writeFileSync('/tmp/login.json', JSON.stringify({ username: 'admin', password: 'admin123' }));
const result = spawnSync('curl', ['-s', '-D', '-', '-X', 'POST', 'http://127.0.0.1:3000/api/auth/login', '-H', 'Content-Type: application/json', '-d', '@/tmp/login.json'], { encoding: 'utf-8' });
const tokenMatch = result.stdout.match(/app_session_id=([^\s;]+)/);
const token = tokenMatch ? tokenMatch[1] : '';
try { unlinkSync('/tmp/login.json'); } catch {}
console.log('Token:', token.length);

// Verify proxy
const v = spawnSync('curl', ['-s', '--max-time', '5', '-b', `app_session_id=${token}`, 'http://127.0.0.1:4999/api/auth/me'], { encoding: 'utf-8' });
console.log('Proxy check:', v.stdout.slice(0, 80));

// Playwright
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (token) {
  await context.addCookies([{ name: 'app_session_id', value: token, domain: 'localhost', path: '/' }]);
}

const page = await context.newPage();
await page.goto('http://localhost:4999/performance-review');
await page.waitForTimeout(8000);
console.log('URL:', page.url());

await page.screenshot({ path: 'screenshot-performance-review.png', fullPage: false });
console.log('Screenshot 1 saved');

const tabs = await page.locator('button[role="tab"]').all();
console.log('Tabs:', tabs.length);
for (const t of tabs) console.log('  ', JSON.stringify(await t.textContent()));

for (const t of tabs) {
  const tx = await t.textContent();
  if (tx && (tx.includes('评委') || tx.includes('Evaluate'))) {
    await t.click(); await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot-performance-review-evaluate.png', fullPage: false });
    console.log('Screenshot 2 saved'); break;
  }
}
for (const t of tabs) {
  const tx = await t.textContent();
  if (tx && (tx.includes('会议纪要') || tx.includes('Summary'))) {
    await t.click(); await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot-performance-review-summary.png', fullPage: false });
    console.log('Screenshot 3 saved'); break;
  }
}

await context.storageState({ path: 'storage-state.json' });
await browser.close();
server.close();
