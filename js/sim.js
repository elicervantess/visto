// =====================================================================
//  VISTO — PÚBLICO SIMULADO (modo respaldo)
//  Sin cámara, la obra funciona igual: un público virtual de 6 personas.
//  Mantener F: todos se van al feed.  Mantener P: se giran hacia la
//  persona uno a uno.  Sin teclas: el feed tienta y casi todos lo miran,
//  con miradas curiosas y breves hacia la persona.
// =====================================================================

export function crearSim() {
  const N = 6;
  let gente = [];
  let reloj = 0;

  function reiniciar() {
    const ahora = performance.now();
    gente = Array.from({ length: N }, (_, i) => ({
      id: 1000 + i, xN: .12 + i * (.76 / (N - 1)), yN: .5, tamN: .05,
      estado: 'feed', personaDesde: 0, hasta: 0, ref: null,
    }));
    gente.forEach((p) => { p.ref = p; p.desde = ahora; });
    reloj = 0;
  }

  function cambiar(p, estado, ahora) {
    if (p.estado === estado) return;
    p.estado = estado;
    if (estado === 'persona') { p.personaDesde = ahora; p.graciaDada = false; }
  }

  function actualizar(dt, teclaF, teclaP) {
    const ahora = performance.now();
    reloj += dt;
    // orden: del centro hacia afuera (se ve bien en el espejo)
    const orden = [...gente].sort((a, b) => Math.abs(a.xN - .5) - Math.abs(b.xN - .5));
    if (teclaP) {
      if (reloj > .35) {
        reloj = 0;
        const p = orden.find((q) => q.estado !== 'persona');
        if (p) { cambiar(p, 'persona', ahora); p.hasta = Infinity; }
      }
    } else if (teclaF) {
      if (reloj > .12) {
        reloj = 0;
        const p = orden.find((q) => q.estado !== 'feed');
        if (p) cambiar(p, 'feed', ahora);
      }
    } else {
      for (const p of gente) {
        if (p.estado === 'persona' && p.hasta === Infinity) p.hasta = ahora + 400 + Math.random() * 1600;
        if (p.estado === 'persona' && ahora > p.hasta) cambiar(p, 'feed', ahora);
        // mirada curiosa y breve (casi nunca llega a 3 s)
        if (p.estado === 'feed' && Math.random() < .03 * dt) { cambiar(p, 'persona', ahora); p.hasta = ahora + 600 + Math.random() * 1800; }
      }
    }
  }

  reiniciar();
  return { actualizar, reiniciar, get pistas() { return gente; } };
}
