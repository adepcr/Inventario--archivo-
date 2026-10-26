// Inventario del Archivo General: búsqueda, agregar, editar y eliminar.
// Los datos viven en Supabase (base de datos en la nube con inicio de sesión).
// La conexión se configura en config.js.

const $ = id => document.getElementById(id);
const PAGE = 150;
let data = [];            // registros
let limit = PAGE;
let shelfSel = "";
let confirmId = null, freshId = null, editId = null;

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function yearRange(a) {
  const m = String(a).match(/(\d{4})\s*[-\/]\s*(\d{4})/);
  if (m) return [+m[1], +m[2]];
  const y = String(a).match(/^\d{4}$/);
  return y ? [+a, +a] : null;
}
function matchYear(a, sel) {
  if (!sel) return true;
  if (/^\d{4}$/.test(sel)) { const r = yearRange(a); return !!r && r[0] <= +sel && +sel <= r[1]; }
  return norm(a) === norm(sel);
}
function nivelKey(n) { const m = String(n).match(/\d+/); return (m ? +m[0] : 99) * 10 + (/tras/i.test(n) ? 1 : 0); }
function sortRows(a, b) {
  return (+a.estante || 99) - (+b.estante || 99) || nivelKey(a.nivel) - nivelKey(b.nivel) || a.bloque.localeCompare(b.bloque) || a.tipo.localeCompare(b.tipo);
}
function hl(text, q) {
  const t = String(text ?? "");
  if (!q) return esc(t);
  const n = norm(t); const i = n.indexOf(q);
  if (i < 0 || n.length !== t.length) return esc(t);
  return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
}

function uniq(key) { return [...new Set(data.map(r => r[key]).filter(Boolean))]; }
function fillOptions() {
  const keep = (id) => $(id).value;
  const areaV = keep("fArea"), anioV = keep("fAnio");
  const areas = uniq("area").sort((a, b) => a.localeCompare(b, "es"));
  $("fArea").innerHTML = '<option value="">Todas</option>' + areas.map(a => `<option>${esc(a)}</option>`).join("");
  const years = new Set(), other = new Set();
  data.forEach(r => { const g = yearRange(r.anio); if (g) for (let y = g[0]; y <= g[1]; y++) years.add(y); else if (r.anio) other.add(r.anio); });
  $("fAnio").innerHTML = '<option value="">Todos</option>' + [...years].sort((a, b) => b - a).map(y => `<option>${y}</option>`).join("") + [...other].sort().map(o => `<option>${esc(o)}</option>`).join("");
  $("fArea").value = areaV; $("fAnio").value = anioV;
  const dl = (id, vals) => $(id).innerHTML = vals.map(v => `<option value="${esc(v)}"></option>`).join("");
  dl("dlTipo", uniq("tipo").sort((a, b) => a.localeCompare(b, "es")));
  dl("dlArea", areas);
  dl("dlNivel", uniq("nivel").sort((a, b) => nivelKey(a) - nivelKey(b)));
  dl("dlBloque", uniq("bloque").sort());
  dl("dlEstante", uniq("estante").sort((a, b) => a - b));
  dl("dlAnio", uniq("anio").sort().reverse());
}

function filtered(ignoreShelf) {
  const area = $("fArea").value, anio = $("fAnio").value;
  const tipo = norm($("fTipo").value), cont = norm($("fCont").value);
  return data.filter(r =>
    (!area || r.area === area) && matchYear(r.anio, anio) &&
    (!tipo || norm(r.tipo).includes(tipo)) &&
    (!cont || norm(r.contenido).includes(cont)) &&
    (ignoreShelf || !shelfSel || r.estante === shelfSel));
}

function renderShelves() {
  const base = filtered(true);
  const counts = {};
  base.forEach(r => counts[r.estante] = (counts[r.estante] || 0) + 1);
  const all = uniq("estante").sort((a, b) => a - b);
  $("shelves").innerHTML = '<span class="lbl">Estante</span>' +
    `<button class="shelf" type="button" data-s="" aria-pressed="${!shelfSel}">Todos<span>${base.length}</span></button>` +
    all.map(s => `<button class="shelf" type="button" data-s="${esc(s)}" aria-pressed="${shelfSel === s}"><b>${esc(s)}</b><span>${counts[s] || 0}</span></button>`).join("");
}

function render() {
  renderShelves();
  const rows = filtered().sort(sortRows);
  const tq = norm($("fTipo").value), cq = norm($("fCont").value);
  const active = $("fArea").value || $("fAnio").value || tq || cq || shelfSel;
  $("count").innerHTML = active
    ? `<strong>${rows.length.toLocaleString("es-CR")}</strong> de ${data.length.toLocaleString("es-CR")} archivos coinciden`
    : `<strong>${data.length.toLocaleString("es-CR")}</strong> archivos en el inventario`;
  if (!rows.length) {
    $("list").innerHTML = `<div class="empty">No hay archivos con esos criterios.<br>Pruebe con menos filtros o revise la ortografía.</div>`;
    $("moreWrap").hidden = true; return;
  }
  $("list").innerHTML = rows.slice(0, limit).map(r => {
    const conf = confirmId === r.id;
    return `<article class="item${conf ? " confirm" : ""}${freshId === r.id ? " fresh" : ""}" data-id="${r.id}">
      <div class="loc">
        <div><small>Estante</small><b>${esc(r.estante)}</b></div>
        <div><small>Nivel</small><b>${esc(r.nivel)}</b></div>
        <div><small>Bloque</small><b>${esc(r.bloque)}</b></div>
      </div>
      <div class="desc">
        <div class="tipo">${hl(r.tipo, tq)}</div>
        <div class="meta"><span class="yr">${esc(r.anio || "Sin año")}</span><span class="ct">${hl(r.contenido || "No especifico", cq)}</span><span>${esc(r.area)}</span></div>
      </div>
      <div class="rowact">${conf
        ? `<span class="q">¿Eliminar este archivo?</span><button class="btn small danger" data-act="yes" type="button">Eliminar</button><button class="btn small" data-act="no" type="button">Cancelar</button>`
        : `<button class="btn small" data-act="edit" type="button" aria-label="Editar ${esc(r.tipo)}">Editar</button><button class="btn small" data-act="del" type="button" aria-label="Eliminar ${esc(r.tipo)}">Eliminar</button>`}</div>
    </article>`;
  }).join("");
  $("moreWrap").hidden = rows.length <= limit;
  $("moreBtn").textContent = `Mostrar más (${(rows.length - limit).toLocaleString("es-CR")} restantes)`;
}

let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }
function setStatus(msg, err) { const s = $("status"); s.textContent = msg; s.classList.toggle("err", !!err); }

// ---------- Conexión con Supabase ----------
const COLUMNAS = "id, estante, nivel, bloque, anio, tipo, contenido, area";
const sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_KEY);

// Traduce los errores de Supabase a mensajes claros
function mensajeError(error) {
  const m = (error && (error.message || error.error_description)) || String(error);
  if (/row-level security|permission denied|42501/i.test(m + (error && error.code))) return "La sesión no es válida. Salga y vuelva a ingresar.";
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "El correo aún no está confirmado. Pida ayuda al administrador.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "No hay conexión a internet. Revise la conexión e intente de nuevo.";
  if (/JWT|session|refresh token/i.test(m)) return "La sesión venció. Vuelva a ingresar.";
  return m;
}

// Supabase entrega máximo 1000 filas por consulta, así que se pide por partes
async function cargarTodo() {
  const todos = [];
  for (let desde = 0; ; desde += 1000) {
    const { data: parte, error } = await sb.from("archivos").select(COLUMNAS).order("id").range(desde, desde + 999);
    if (error) throw error;
    todos.push(...parte);
    if (parte.length < 1000) break;
  }
  return todos.map(normalizar);
}

// Los ids llegan como números; en la página se manejan como texto (data-id)
const normalizar = r => ({ ...r, id: String(r.id) });
const ubicacion = r => `Estante ${r.estante}, Nivel ${r.nivel}, Bloque ${r.bloque}`;

$("list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const id = b.closest(".item").dataset.id;
  const act = b.dataset.act;
  if (act === "edit") openSheet(true, data.find(x => x.id === id));
  else if (act === "del") { confirmId = id; render(); }
  else if (act === "no") { confirmId = null; render(); }
  else if (act === "yes") {
    const r = data.find(x => x.id === id);
    b.disabled = true;
    // .select() devuelve lo que se borró: si viene vacío, no se borró nada (sin permiso o ya no existía)
    const { data: borrados, error } = await sb.from("archivos").delete().eq("id", Number(id)).select("id");
    if (error || !borrados.length) {
      b.disabled = false;
      setStatus("No se pudo eliminar. " + (error ? mensajeError(error) : "Puede que otra persona ya lo eliminara. Recargue la página."), true);
      return;
    }
    data = data.filter(x => x.id !== id); confirmId = null;
    fillOptions(); render(); setStatus("");
    toast(`Eliminado: ${r.tipo} (${ubicacion(r)})`);
  }
});
$("shelves").addEventListener("click", e => {
  const b = e.target.closest(".shelf"); if (!b) return;
  shelfSel = b.dataset.s; limit = PAGE; render();
});
["fArea", "fAnio"].forEach(id => $(id).addEventListener("change", () => { limit = PAGE; render(); }));
["fTipo", "fCont"].forEach(id => $(id).addEventListener("input", () => { limit = PAGE; render(); }));
$("clearBtn").addEventListener("click", () => { ["fArea", "fAnio", "fTipo", "fCont"].forEach(id => $(id).value = ""); shelfSel = ""; limit = PAGE; render(); });
$("moreBtn").addEventListener("click", () => { limit += PAGE; render(); });

// ---------- Formulario (agregar y editar) ----------
const FORM = { aEstante: "estante", aNivel: "nivel", aBloque: "bloque", aAnio: "anio", aTipo: "tipo", aCont: "contenido", aArea: "area" };
const OBLIGATORIOS = { estante: "Estante", nivel: "Nivel", bloque: "Bloque", tipo: "Tipo / contenido", area: "Área" };
let formDeEdicion = false; // el formulario quedó con los datos de una edición

function openSheet(o, registro) {
  $("sheet").hidden = !o; $("scrim").hidden = !o; $("formErr").hidden = true;
  if (!o) return;
  editId = registro ? registro.id : null;
  $("sheetTitle").textContent = registro ? "Editar archivo" : "Agregar archivo";
  $("submitBtn").textContent = registro ? "Guardar cambios" : "Guardar archivo";
  if (registro) {
    Object.entries(FORM).forEach(([campo, k]) => $(campo).value = registro[k] === "No especifico" ? "" : registro[k]);
    formDeEdicion = true;
  } else if (formDeEdicion) {
    Object.keys(FORM).forEach(campo => $(campo).value = "");
    formDeEdicion = false;
  }
  setTimeout(() => $("aEstante").focus(), 30);
}
$("addBtn").addEventListener("click", () => openSheet(true));
$("closeSheet").addEventListener("click", () => openSheet(false));
$("cancelAdd").addEventListener("click", () => openSheet(false));
$("scrim").addEventListener("click", () => openSheet(false));
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) openSheet(false); });

$("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  // La base de datos también limpia y valida (mayúsculas, espacios, largo máximo)
  const datos = {};
  Object.entries(FORM).forEach(([campo, k]) => datos[k] = $(campo).value.replace(/\s+/g, " ").trim());
  const faltan = Object.keys(OBLIGATORIOS).filter(k => !datos[k]).map(k => OBLIGATORIOS[k]);
  if (faltan.length) { $("formErr").textContent = "Complete: " + faltan.join(", ") + "."; $("formErr").hidden = false; return; }

  const btn = $("submitBtn"); btn.disabled = true;
  const consulta = editId
    ? sb.from("archivos").update(datos).eq("id", Number(editId)).select(COLUMNAS)
    : sb.from("archivos").insert(datos).select(COLUMNAS);
  const { data: filas, error } = await consulta;
  btn.disabled = false;
  if (error || !filas.length) {
    $("formErr").textContent = error ? mensajeError(error) : "No se guardó. Puede que otra persona eliminara este archivo. Recargue la página.";
    $("formErr").hidden = false; return;
  }
  const guardado = normalizar(filas[0]);
  const fueEdicion = !!editId;
  if (fueEdicion) data = data.map(x => x.id === editId ? guardado : x);
  else { data.push(guardado); ["aAnio", "aTipo", "aCont"].forEach(id => $(id).value = ""); }
  freshId = guardado.id;
  openSheet(false);
  // mostrar el registro guardado
  ["fArea", "fAnio", "fCont"].forEach(id => $(id).value = ""); shelfSel = guardado.estante; $("fTipo").value = guardado.tipo;
  limit = PAGE; fillOptions(); render(); setStatus("");
  toast(`${fueEdicion ? "Cambios guardados" : "Agregado"}: ${ubicacion(guardado)}`);
});

// ---------- Sesión ----------
function mostrarVista(conSesion) {
  $("loginView").hidden = conSesion;
  $("appView").hidden = !conSesion;
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const correo = $("lCorreo").value.trim(), clave = $("lClave").value;
  if (!correo || !clave) { $("loginErr").textContent = "Escriba su correo y contraseña."; $("loginErr").hidden = false; return; }
  $("loginBtn").disabled = true; $("loginErr").hidden = true;
  const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
  $("loginBtn").disabled = false;
  if (error) { $("loginErr").textContent = mensajeError(error); $("loginErr").hidden = false; return; }
  $("lClave").value = "";
});

$("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
});

let usuarioActual = null;
async function entrar(user) {
  if (usuarioActual === user.id) return;
  usuarioActual = user.id;
  mostrarVista(true);
  $("who").textContent = user.email;
  await recargar();
}

function salir() {
  usuarioActual = null; data = [];
  ["fArea", "fAnio", "fTipo", "fCont"].forEach(id => $(id).value = ""); shelfSel = ""; limit = PAGE; confirmId = freshId = null;
  $("list").innerHTML = ""; $("count").textContent = "Cargando inventario…"; setStatus("");
  openSheet(false);
  mostrarVista(false);
  setTimeout(() => $("lCorreo").focus(), 30);
}

async function recargar() {
  try {
    data = await cargarTodo();
    fillOptions(); render(); setStatus("");
  } catch (err) {
    if (!data.length) $("count").textContent = "No se pudo cargar el inventario.";
    setStatus(mensajeError(err), true);
  }
}

if (/SU-PROYECTO|PEGUE-AQUI/.test(window.CONFIG.SUPABASE_URL + window.CONFIG.SUPABASE_KEY)) {
  $("loginErr").textContent = "Falta configurar la conexión: complete config.js con los datos de su proyecto de Supabase.";
  $("loginErr").hidden = false;
}

sb.auth.onAuthStateChange((evento, sesion) => {
  // Se difiere para no llamar a Supabase dentro del aviso de cambio de sesión
  setTimeout(() => { sesion && sesion.user ? entrar(sesion.user) : salir(); }, 0);
});

// Al volver a la app (otra pestaña, celular desbloqueado) trae los cambios que hicieron otras personas
let ultimaCarga = Date.now();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && usuarioActual && $("sheet").hidden && Date.now() - ultimaCarga > 30000) {
    ultimaCarga = Date.now(); recargar();
  }
});

// App instalable: guarda la página para que abra rápido y funcione como app
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
