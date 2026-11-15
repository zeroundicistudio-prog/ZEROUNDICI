const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1920, height: 1200}});
  p.on('pageerror', e => console.error(e.message));
  await p.goto('file://' + path.join(__dirname, process.argv[2])); await p.waitForFunction(() => window.done);
  await p.locator('canvas').screenshot({path: process.argv[3]}); await b.close(); })();
