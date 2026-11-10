// Convierte promo.html en un video MP4 (1920x1080, 30 fps), cuadro por cuadro.
// Uso:  node video/render.js [salida.mp4]
// Requiere: Node, Playwright (npm i playwright && npx playwright install chromium) y ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const fps = Number(process.env.FPS) || 30;
  const out = process.argv[2] || path.join(__dirname, 'promo.mp4');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'promo.html') + '?render');
  await page.waitForFunction(() => window.READY === true);
  await page.waitForTimeout(500);
  const dur = await page.evaluate(() => DUR);
  const total = Math.round(dur * fps);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < total; i++) {
    await page.evaluate(t => render(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) process.stdout.write(`\rcuadro ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`\nListo: ${out}`);
})();
