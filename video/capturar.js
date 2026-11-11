// Abre la app REAL (carpeta docs/) con datos de ejemplo y toma las capturas que usa promo.html.
// Uso: node video/capturar.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');
const OUT = path.join(__dirname, 'capturas');
const FALSO = fs.readFileSync(path.join(__dirname, 'supabase-falso.js'));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta === '/lib/supabase.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(FALSO); }
  const f = path.join(DOCS, ruta === '/' ? 'index.html' : ruta);
  if (!f.startsWith(DOCS) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  // idioma español para que las fechas salgan como 20/11/2026
  const browser = await chromium.launch({ env: { ...process.env, LANG: 'es_CR.UTF-8', LC_ALL: 'es_CR.UTF-8', LANGUAGE: 'es_CR:es' } });
  const foto = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  const listo = p => p.waitForFunction(() => document.querySelectorAll('.item').length > 0);

  // ---- Celular ----
  const movil = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CR' };
  let ctx = await browser.newContext(movil);
  let p = await ctx.newPage();
  await p.addInitScript(() => { window.__SIN_SESION = true; });
  await p.goto(URL); await p.waitForSelector('#loginForm:not([hidden])'); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await foto(p, 'm_login');
  await ctx.close();

  ctx = await browser.newContext(movil);
  p = await ctx.newPage();
  await p.goto(URL); await listo(p); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  // se baja hasta el buscador para que se vean los filtros y la lista
  await p.evaluate(() => scrollTo(0, document.querySelector('.filters').offsetTop - 12));
  await p.waitForTimeout(200);
  const texto = 'caja chica';
  for (let i = 0; i <= texto.length; i++) {
    await p.fill('#fTipo', texto.slice(0, i));
    await p.evaluate(() => scrollTo(0, document.querySelector('.filters').offsetTop - 12));
    await p.waitForTimeout(60);
    await foto(p, 'm_tipo_' + String(i).padStart(2, '0'));
  }
  // lista de resultados (sin filtros arriba)
  await p.evaluate(() => scrollTo(0, document.querySelector('.summary').getBoundingClientRect().top + scrollY - 10));
  await p.waitForTimeout(200);
  await foto(p, 'm_resultados');
  // tarjetas sueltas
  await p.fill('#fTipo', '');
  const items = await p.$$('.item');
  for (let i = 0; i < 6; i++) await items[[0, 4, 8, 12, 14, 18][i]].screenshot({ path: path.join(OUT, `tarjeta_${i}.png`) });
  await p.fill('#fTipo', 'caja chica');
  await p.waitForTimeout(100);
  const caja = p.locator('.item', { hasText: 'Enero a abril' });
  await caja.screenshot({ path: path.join(OUT, 'tarjeta_caja.png') });

  // préstamo
  await caja.locator('[data-act="prestar"]').click();
  await p.waitForSelector('#prestarSheet:not([hidden])');
  await p.type('#pPersona', 'Ana Rojas, Contabilidad', { delay: 10 });
  await p.fill('#pHasta', new Date(Date.now() + 9 * 864e5).toLocaleDateString('en-CA'));
  await p.fill('#pNota', 'Para la auditoría');
  await p.locator('#pPersona').blur();
  await p.waitForTimeout(300);
  await foto(p, 'm_prestar');
  await p.click('#prestarBtn');
  await p.waitForTimeout(500);
  const prestada = p.locator('.item', { hasText: 'Enero a abril' });
  await prestada.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 200));
  await p.waitForTimeout(200);
  await foto(p, 'm_prestado');
  await p.evaluate(() => { document.getElementById('toast').hidden = true; });
  await prestada.screenshot({ path: path.join(OUT, 'tarjeta_prestada.png') });
  await p.evaluate(() => scrollTo(0, 0));
  await p.click('#prestBtn');
  await p.waitForSelector('#prestLista li');
  await p.waitForTimeout(400);
  await foto(p, 'm_prestados');
  await ctx.close();

  // ---- Computadora ----
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, acceptDownloads: true, locale: 'es-CR' });
  p = await ctx.newPage();
  await p.goto(URL); await listo(p); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await foto(p, 'd_inicio');
  const botonRespaldo = await p.locator('#respaldoBtn').boundingBox();
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#respaldoBtn')]);
  await p.waitForSelector('#toast:not([hidden])');
  await p.waitForTimeout(300);
  await foto(p, 'd_respaldo');
  // datos que usa promo.html: dónde está el botón y cómo se llama el Excel
  fs.writeFileSync(path.join(OUT, 'datos.js'), 'window.CAPTURAS = ' + JSON.stringify({ botonRespaldo, nombreExcel: descarga.suggestedFilename() }) + ';\n');
  await browser.close(); server.close();
  console.log('Capturas en', OUT);
})();
