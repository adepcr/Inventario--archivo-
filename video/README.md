# Video promocional

Animación de 42 segundos del Inventario del Archivo General. Las pantallas que se ven son la **app real**
(carpeta `docs/`), capturadas con **datos de ejemplo inventados**: el video no muestra datos reales del inventario.

- `capturar.js`: abre la app real en un navegador, la usa (inicia sesión, busca "caja chica", presta un archivo,
  abre Prestados y descarga el respaldo) y guarda las capturas en `capturas/`.
- `supabase-falso.js`: reemplaza a Supabase **solo durante la captura**, con 24 archivos de ejemplo. No toca la base de datos.
- `promo.html`: la animación hecha con esas capturas. Ábrala en el navegador para verla en vivo.
- `render.js`: graba la animación cuadro por cuadro y arma el MP4 (1920x1080, 30 fps).

## Cómo generar el video

Requiere Node.js, ffmpeg y Playwright (`npm i playwright && npx playwright install chromium`).

```
node video/capturar.js            # solo si cambió la app: vuelve a tomar las capturas
node video/render.js video/promo.mp4
```

Versión vertical para TikTok/Reels (1080x1920, con texto arriba):

```
ffmpeg -i video/promo.mp4 -vf "scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:black,drawtext=text='Hecho con Claude':fontcolor=white:fontsize=60:x=(w-tw)/2:y=470,drawtext=text='Solo 1 prompt':fontcolor=white:fontsize=60:x=(w-tw)/2:y=550" -c:v libx264 -crf 18 -pix_fmt yuv420p video/promo-vertical.mp4
```

Los textos y tiempos de cada escena están en la función `escena(t)` de `promo.html`. Para dar más o menos tiempo de lectura a una escena, cambie la lista `LENTO`; los datos de ejemplo, en `supabase-falso.js`.
Los MP4 no se suben al repositorio (ver `.gitignore`).
