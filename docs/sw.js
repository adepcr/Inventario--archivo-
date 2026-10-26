// Service worker: permite instalar la app y que abra rápido.
// Guarda solo los archivos de la página; los datos siempre se piden a Supabase.
// Al publicar una versión nueva de la app, cambie el número de VERSION.
const VERSION = "inventario-v3";
const ARCHIVOS = [
  "./", "index.html", "estilos.css", "app.js", "config.js", "lib/supabase.js",
  "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero intenta internet (para tener siempre la última versión); si no hay, usa lo guardado
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
