# Video promocional

Animación de 23 segundos del Inventario del Archivo General, hecha con código (HTML + CSS + JavaScript).

- `promo.html`: la animación. Ábrala en el navegador para verla en vivo (se repite sola).
- `render.js`: la graba cuadro por cuadro y arma el MP4 (1920x1080, 30 fps).

## Cómo generar el video

Requiere Node.js, ffmpeg y Playwright (`npm i playwright && npx playwright install chromium`).

```
node video/render.js video/promo.mp4
```

Versión vertical para TikTok/Reels (1080x1920, con texto arriba):

```
ffmpeg -i video/promo.mp4 -vf "scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:black,drawtext=text='Hecho con Claude':fontcolor=white:fontsize=60:x=(w-tw)/2:y=470,drawtext=text='Solo 1 prompt':fontcolor=white:fontsize=60:x=(w-tw)/2:y=550" -c:v libx264 -crf 18 -pix_fmt yuv420p video/promo-vertical.mp4
```

Los textos, datos y tiempos de cada escena están en la función `render(t)` de `promo.html`.
Los MP4 no se suben al repositorio (ver `.gitignore`).
