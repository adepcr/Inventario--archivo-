// Reemplazo de la librería de Supabase SOLO para grabar el video promocional.
// La app real (docs/) corre igual, pero con datos de ejemplo inventados en vez de la base de datos.
(() => {
  const AREAS = ["Contabilidad", "Tesorería", "Recursos Humanos", "Secretaría", "Junta Directiva", "Proveeduría"];
  const filas = [
    [1, "1", "1 FRONTAL", "A", "2024", "Actas de Junta Directiva", "Sesiones ordinarias", "Junta Directiva"],
    [2, "1", "1 FRONTAL", "B", "2023", "Actas de Junta Directiva", "Sesiones extraordinarias", "Junta Directiva"],
    [3, "1", "2 FRONTAL", "A", "2020-2022", "Correspondencia enviada", "Oficios", "Secretaría"],
    [4, "1", "2 TRASERO", "C", "2021", "Correspondencia recibida", "Enero a junio", "Secretaría"],
    [5, "2", "1 FRONTAL", "A", "2022", "Planillas", "Enero a diciembre", "Recursos Humanos"],
    [6, "2", "1 FRONTAL", "B", "2023", "Planillas", "Enero a diciembre", "Recursos Humanos"],
    [7, "2", "2 FRONTAL", "A", "2020", "Expedientes de personal", "Renuncias", "Recursos Humanos"],
    [8, "2", "3 TRASERO", "D", "General", "Contratos", "Servicios profesionales", "Proveeduría"],
    [9, "3", "1 FRONTAL", "A", "2021", "Caja chica", "Enero a junio", "Contabilidad"],
    [10, "3", "1 FRONTAL", "B", "2022", "Caja chica", "Julio a diciembre", "Contabilidad"],
    [11, "3", "2 FRONTAL", "C", "2023", "Caja chica", "Enero a abril", "Contabilidad"],
    [12, "3", "2 FRONTAL", "D", "2024", "Caja chica", "Marzo", "Contabilidad"],
    [13, "3", "3 FRONTAL", "A", "2023", "Facturas", "Proveedores", "Contabilidad"],
    [14, "3", "3 TRASERO", "B", "2024", "Conciliaciones bancarias", "Primer semestre", "Tesorería"],
    [15, "4", "1 FRONTAL", "A", "2022", "Recibos de pago", "Afiliados", "Tesorería"],
    [16, "4", "1 TRASERO", "B", "2023", "Recibos de pago", "Afiliados", "Tesorería"],
    [17, "4", "2 FRONTAL", "C", "2019", "Órdenes de compra", "Suministros", "Proveeduría"],
    [18, "4", "3 FRONTAL", "A", "2024", "Estados financieros", "Auditoría externa", "Contabilidad"],
    [19, "5", "1 FRONTAL", "A", "2018-2020", "Afiliaciones", "Solicitudes aprobadas", "Secretaría"],
    [20, "5", "2 FRONTAL", "B", "2021", "Afiliaciones", "Solicitudes aprobadas", "Secretaría"],
    [21, "5", "2 TRASERO", "C", "2025", "Caja chica", "Enero a marzo", "Contabilidad"],
    [22, "5", "3 FRONTAL", "D", "2025", "Planillas", "Enero a junio", "Recursos Humanos"],
    [23, "6", "1 FRONTAL", "A", "2017", "Libros contables", "Diario y mayor", "Contabilidad"],
    [24, "6", "2 FRONTAL", "B", "General", "Reglamentos", "Internos", "Junta Directiva"],
  ];
  const archivos = filas.map(([id, estante, nivel, bloque, anio, tipo, contenido, area]) => ({ id, estante, nivel, bloque, anio, tipo, contenido, area }));
  const hoy = new Date().toISOString();
  const prestamos = [
    { id: 1, archivo_id: 6, archivo: archivos[5], persona: "Luis Mora, Recursos Humanos", nota: null, devolver_antes: null,
      prestado_en: new Date(Date.now() - 5 * 864e5).toISOString(), prestado_por: "archivo@ejemplo.com", devuelto_en: null, devuelto_por: null },
  ];
  const sesion = { user: { id: "u1", email: "archivo@ejemplo.com", user_metadata: {} } };

  function consulta(tabla) {
    let filtro = null, inv = false;
    const q = {
      select() { return q; }, order() { return q; }, eq() { return q; },
      is(c, v) { filtro = "abiertos"; return q; },
      not() { filtro = "cerrados"; return q; },
      range(a) { q._desde = a; return q; },
      then(ok, mal) {
        let d = tabla === "archivos" ? archivos : tabla === "prestamos" ? prestamos : [];
        if (tabla === "prestamos" && filtro === "abiertos") d = d.filter(p => !p.devuelto_en);
        if (tabla === "prestamos" && filtro === "cerrados") d = d.filter(p => p.devuelto_en);
        if (q._desde) d = [];
        return Promise.resolve({ data: d.map(x => ({ ...x })), error: null }).then(ok, mal);
      }
    };
    return q;
  }
  const rpc = async (nombre, a) => {
    if (nombre === "mi_rol") return { data: "editor", error: null };
    if (nombre === "prestar_archivo") {
      const arch = archivos.find(x => x.id === a.p_archivo);
      const p = { id: prestamos.length + 1, archivo_id: arch.id, archivo: arch, persona: a.p_persona, nota: a.p_nota, devolver_antes: a.p_devolver_antes,
        prestado_en: hoy, prestado_por: sesion.user.email, devuelto_en: null, devuelto_por: null };
      prestamos.push(p); return { data: p, error: null };
    }
    if (nombre === "devolver_archivo") {
      const p = prestamos.find(x => x.id === a.p_prestamo); p.devuelto_en = new Date().toISOString(); p.devuelto_por = sesion.user.email;
      return { data: p, error: null };
    }
    return { data: null, error: null };
  };
  window.supabase = {
    createClient: () => ({
      from: consulta, rpc,
      auth: {
        onAuthStateChange(cb) { setTimeout(() => cb("INITIAL_SESSION", window.__SIN_SESION ? null : sesion), 0); return { data: { subscription: { unsubscribe() {} } } }; },
        signInWithPassword: async () => ({ data: sesion, error: null }), signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ data: sesion, error: null }),
      }
    })
  };
})();
