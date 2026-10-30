// Arma un archivo de Excel (.xlsx) en el navegador, sin librerías externas.
// Uso: crearExcel([{ nombre: "Hoja", columnas: [{ titulo, ancho }], filas: [[...], ...] }]) -> Blob
// Todas las celdas se guardan como texto. La primera fila (títulos) va en negrita y queda fija.

(function () {
  const xml = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const col = n => { let s = ""; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const celda = (v, r, c, estilo) => `<c r="${col(c)}${r}" t="inlineStr"${estilo ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;

  function hoja({ columnas, filas }) {
    const cols = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 14}" customWidth="1"/>`).join("");
    const cab = `<row r="1">${columnas.map((c, i) => celda(c.titulo, 1, i, true)).join("")}</row>`;
    const cuerpo = filas.map((f, r) => `<row r="${r + 2}">${f.map((v, c) => celda(v, r + 2, c)).join("")}</row>`).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      `<cols>${cols}</cols><sheetData>${cab}${cuerpo}</sheetData>` +
      (filas.length ? `<autoFilter ref="A1:${col(columnas.length - 1)}${filas.length + 1}"/>` : "") +
      "</worksheet>";
  }

  // Excel necesita un nombre definido por cada hoja con filtro en la primera fila
  function filtros(hojas, nombre) {
    const d = hojas.map((h, i) => h.filas.length
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nombre(h).replace(/'/g, "''")}'!$A$1:$${col(h.columnas.length - 1)}$${h.filas.length + 1}</definedName>`
      : "").join("");
    return d ? `<definedNames>${d}</definedNames>` : "";
  }

  function archivos(hojas) {
    const ns = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
    const tipo = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    // Excel no acepta estos caracteres en el nombre de una hoja, ni más de 31 letras
    const nombre = h => xml(String(h.nombre).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31));
    const f = {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        "</Types>",
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${ns}>` +
        `<Relationship Id="rId1" Type="${tipo}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        hojas.map((h, i) => `<sheet name="${nombre(h)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        "</sheets>" + filtros(hojas, nombre) + "</workbook>",
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships ${ns}>` +
        hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="${tipo}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${hojas.length + 1}" Type="${tipo}/styles" Target="styles.xml"/></Relationships>`,
      "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF006B35"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    };
    hojas.forEach((h, i) => f[`xl/worksheets/sheet${i + 1}.xml`] = hoja(h));
    return f;
  }

  // ZIP sin comprimir (Excel lo abre igual)
  const TABLA = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  function zip(mapa) {
    const enc = new TextEncoder(), partes = [], central = [];
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const dia = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    let pos = 0;
    for (const [ruta, texto] of Object.entries(mapa)) {
      const nombre = enc.encode(ruta), datos = enc.encode(texto), crc = crc32(datos);
      const local = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, dia, 2], [14, crc, 4],
       [18, datos.length, 4], [22, datos.length, 4], [26, nombre.length, 2], [28, 0, 2]]
        .forEach(([o, v, n]) => n === 4 ? local.setUint32(o, v, true) : local.setUint16(o, v, true));
      const cen = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, dia, 2], [16, crc, 4],
       [20, datos.length, 4], [24, datos.length, 4], [28, nombre.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2],
       [36, 0, 2], [38, 0, 4], [42, pos, 4]]
        .forEach(([o, v, n]) => n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true));
      partes.push(local, nombre, datos);
      central.push(cen, nombre);
      pos += 30 + nombre.length + datos.length;
    }
    const tam = central.reduce((s, p) => s + p.byteLength, 0);
    const fin = new DataView(new ArrayBuffer(22));
    const n = Object.keys(mapa).length;
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, n, 2], [10, n, 2], [12, tam, 4], [16, pos, 4], [20, 0, 2]]
      .forEach(([o, v, k]) => k === 4 ? fin.setUint32(o, v, true) : fin.setUint16(o, v, true));
    return new Blob([...partes, ...central, fin], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  window.crearExcel = hojas => zip(archivos(hojas));
})();
