// Uso: node render.js stills 1.5 4 7.5 ...   |   node render.js video [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const root = __dirname;
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); }
    const ext = path.extname(p); res.writeHead(200, {'Content-Type': ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.png' ? 'image/png' : 'application/octet-stream'}); res.end(d); });
}).listen(0);
(async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  const PAGE = process.env.PAGE || 'zeroundici_giornata.html', OUT = process.env.OUT || 'zeroundici_giornata.mp4';
  await page.goto(`http://localhost:${port}/${PAGE}?render`);
  await page.evaluate(() => window.ready);
  const grab = async t => Buffer.from((await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t)).split(',')[1], 'base64');
  const mode = process.argv[2];
  if (mode === 'stills') {
    fs.mkdirSync(path.join(root, 'stills'), { recursive: true });
    for (const t of process.argv.slice(3)) fs.writeFileSync(path.join(root, 'stills', `${PAGE.replace('.html','')}_${t}.png`), await grab(parseFloat(t)));
  } else {
    const fps = parseInt(process.argv[3] || '30');
    const dur = await page.evaluate(() => window.DURATION);
    const out = path.join(root, OUT);
    fs.writeFileSync(path.join(root, OUT.replace('.mp4', '_cues.json')), JSON.stringify(await page.evaluate(() => window.CUES || [])));
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * fps);
    for (let i = 0; i < n; i++) { const b = await grab(i / fps); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('video:', out, n, 'frames');
  }
  await browser.close(); server.close();
})();
