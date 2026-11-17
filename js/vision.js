// =====================================================================
//  VISTO — VISIÓN
//  Cámara + detección multi-persona + seguimiento + clasificación.
//
//  Estrategia para caras pequeñas (hasta ~3 m con webcam 1080p):
//  1) DESCUBRIR: se recorre la imagen en un mosaico multiescala
//     (cuadro completo, cuadros medianos, cuadros chicos) para que
//     incluso una cara de ~60 px ocupe buena parte de lo que ve el modelo.
//  2) SEGUIR: cada cara encontrada se vuelve a medir con un recorte
//     ampliado alrededor de su última posición (rápido y preciso).
//  La orientación (giro) sale de la posición de la nariz entre las
//  mejillas; el cabeceo, de la nariz entre frente y mentón.
//  No es seguimiento de ojos: es hacia dónde apunta la cabeza.
// =====================================================================

import { CONFIG } from './config.js';

const V = CONFIG.vision;

export function crearVision() {
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.autoplay = true;

  let worker = null;
  let listo = false;
  let delegado = '';
  let enVuelo = 0;            // trabajos enviados al worker sin respuesta
  let idTrabajo = 0;
  const trabajos = new Map();
  let vistas = [];
  let idxVista = 0;
  let ciclo = 0;
  let pistas = [];
  let sigId = 1;
  let msInferencia = 0;
  let inferenciasSeg = 0, contInf = 0, tInf = performance.now();
  let ultimaVista = null;
  let error = '';

  // calibración: giroBase(x) = a + b·x ; cabeceoBase = c
  let cal = { a: 0, b: 0, c: 0.56 };
  let invertido = false;
  try {
    const g = JSON.parse(localStorage.getItem('visto.cal') || 'null');
    if (g) { cal = g.cal || cal; invertido = !!g.invertido; }
  } catch (e) { }
  const guardarCal = () => { try { localStorage.setItem('visto.cal', JSON.stringify({ cal, invertido })); } catch (e) { } };

  // ---------------- MODELO (worker) ----------------
  function filtroLuz() { return `brightness(${V.realceLuz}) contrast(${V.realceContraste})`; }

  function cargarModelo() {
    return new Promise((resolve, reject) => {
      try {
        worker = new Worker('js/detector.worker.js');
      } catch (e) { reject(e); return; }
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.tipo === 'listo') { listo = true; delegado = m.delegado; resolve(m.delegado); }
        else if (m.tipo === 'resultado') recibir(m);
        else if (m.tipo === 'error') {
          error = m.mensaje;
          if (!listo) reject(new Error(m.mensaje));
          if (trabajos.has(m.id)) { trabajos.delete(m.id); enVuelo--; }
        }
      };
      worker.onerror = (e) => { error = e.message || 'worker'; reject(e); };
      worker.postMessage({ tipo: 'init', opciones: V, filtro: filtroLuz() });
    });
  }

  function actualizarOpciones() {
    if (!worker) return;
    worker.postMessage({ tipo: 'filtro', filtro: filtroLuz() });
    worker.postMessage({ tipo: 'opciones', opciones: V });
    calcularVistas();
  }

  // ---------------- CÁMARA ----------------
  async function iniciarCamara() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: V.camaraAncho }, height: { ideal: V.camaraAlto }, frameRate: { ideal: 30 } },
    });
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => { if (video.videoWidth) r(); else video.onloadedmetadata = r; });
    calcularVistas();
    return { w: video.videoWidth, h: video.videoHeight };
  }
  const camaraActiva = () => !!(video.srcObject && video.videoWidth && video.readyState >= 2);

  // ---------------- MOSAICO MULTIESCALA ----------------
  // Lista de recortes (en px de la cámara) que se recorren para descubrir caras.
  function calcularVistas() {
    const W = video.videoWidth || 1920, H = video.videoHeight || 1080;
    // tamaño de cada cuadro como fracción de la altura de la cámara
    const niveles = { normal: [.6], lejos: [.42], muy_lejos: [.3] }[V.mosaico] || [.42];
    const y0 = (V.zonaArriba ?? 0) * H, y1 = (V.zonaAbajo ?? 1) * H;
    const out = [{ sx: 0, sy: 0, sw: W, sh: H, nivel: 0 }];
    niveles.forEach((f, n) => {
      const s = Math.round(f * H);
      const paso = s * .75;           // 25% de traslape para no cortar caras
      const filas = Math.max(1, Math.ceil((y1 - y0 - s) / paso) + 1);
      const cols = Math.max(1, Math.ceil((W - s) / paso) + 1);
      const lista = [];
      for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
        const sx = Math.min(W - s, Math.round(c * paso));
        const sy = Math.min(Math.max(0, y1 - s), Math.round(y0 + r * paso));
        lista.push({ sx, sy, sw: s, sh: s, nivel: n + 1 });
      }
      out.push(...lista);
    });
    // intercalar: el cuadro completo aparece seguido (gente cerca entra rápido)
    const completo = out.shift();
    vistas = [];
    out.forEach((v, i) => { if (i % 4 === 0) vistas.push(completo); vistas.push(v); });
    if (!vistas.length) vistas.push(completo);
    idxVista = 0;
  }

  // ---------------- PROGRAMADOR DE TRABAJOS ----------------
  // Se llama cada frame. Mantiene el worker ocupado sin bloquear la animación.
  function paso() {
    if (!listo || !camaraActiva() || enVuelo >= 1) return;
    const ahora = performance.now();
    ciclo++;
    // pistas que necesitan nueva medición (la más antigua primero)
    let candidata = null;
    for (const p of pistas) if (ahora - p.intento > 60 && (!candidata || p.intento < candidata.intento)) candidata = p;
    // 2 de cada 3 trabajos son de seguimiento si hay caras; el resto, descubrimiento
    if (candidata && (ciclo % 3 !== 0)) enviarSeguimiento(candidata, ahora);
    else enviarDescubrimiento();
  }

  function enviar(region, extra) {
    const W = video.videoWidth, H = video.videoHeight;
    let { sx, sy, sw, sh } = region;
    sx = Math.max(0, Math.min(W - 1, sx)); sy = Math.max(0, Math.min(H - 1, sy));
    sw = Math.min(sw, W - sx); sh = Math.min(sh, H - sy);
    if (sw < 16 || sh < 16) return;
    // resolución que se manda al modelo: nunca más grande que lo necesario
    const maxLado = extra.tipo === 'seg' ? 320 : (sw >= W ? 1024 : 640);
    const k = Math.min(1, maxLado / Math.max(sw, sh));
    const id = ++idTrabajo;
    const r = { sx, sy, sw, sh };
    trabajos.set(id, { ...extra, r });
    enVuelo++;
    ultimaVista = r;
    createImageBitmap(video, sx, sy, sw, sh, { resizeWidth: Math.round(sw * k), resizeHeight: Math.round(sh * k), resizeQuality: 'medium' })
      .then((bmp) => worker.postMessage({ tipo: 'detectar', id, bmp }, [bmp]))
      .catch(() => { trabajos.delete(id); enVuelo--; });
  }

  function enviarDescubrimiento() {
    if (!vistas.length) calcularVistas();
    const v = vistas[idxVista++ % vistas.length];
    enviar(v, { tipo: 'desc' });
  }

  function enviarSeguimiento(p, ahora) {
    p.intento = ahora;
    const s = Math.max(150, p.tam * 2.6);
    enviar({ sx: p.cx - s / 2, sy: p.cy - s / 2, sw: s, sh: s }, { tipo: 'seg', pista: p.id });
  }

  // ---------------- RESULTADOS → PISTAS ----------------
  function aMarco(c, r) {
    // convierte una cara (coords normalizadas del recorte) a px de la cámara
    const X = (x) => r.sx + x * r.sw, Y = (y) => r.sy + y * r.sh;
    const [x0, y0, x1, y1] = c.caja;
    const w = (x1 - x0) * r.sw, h = (y1 - y0) * r.sh;
    const nx = X(c.nariz[0]), dX = X(c.mejD[0]), iX = X(c.mejI[0]);
    const fy = Y(c.frente[1]), my = Y(c.menton[1]), ny = Y(c.nariz[1]);
    const ancho = iX - dX;
    const giro = Math.abs(ancho) > 2 ? Math.max(-1, Math.min(1, ((nx - dX) / ancho) * 2 - 1)) : 0;
    const cab = Math.abs(my - fy) > 2 ? (ny - fy) / (my - fy) : cal.c;
    return { cx: X((x0 + x1) / 2), cy: Y((y0 + y1) / 2), tam: Math.max(w, h), giro, cab };
  }

  function recibir(m) {
    const t = trabajos.get(m.id);
    if (!t) return;
    trabajos.delete(m.id);
    enVuelo--;
    msInferencia = msInferencia * .9 + m.ms * .1;
    contInf++;
    const ahora = performance.now();
    if (ahora - tInf > 1000) { inferenciasSeg = contInf; contInf = 0; tInf = ahora; }

    const caras = m.caras.map((c) => aMarco(c, t.r));
    if (t.tipo === 'seg') {
      const p = pistas.find((q) => q.id === t.pista);
      if (!p) return;
      // la cara más cercana al centro del recorte es la misma persona
      let mejor = null, dm = Infinity;
      for (const c of caras) { const d = Math.hypot(c.cx - p.cx, c.cy - p.cy); if (d < dm) { dm = d; mejor = c; } }
      if (mejor && dm < Math.max(p.tam, 40)) medir(p, mejor, ahora);
      else p.fallos++;
    } else {
      for (const c of caras) {
        const p = pistas.find((q) => Math.hypot(c.cx - q.cx, c.cy - q.cy) < Math.max(q.tam, c.tam) * .7);
        if (p) medir(p, c, ahora);
        else if (pistas.length < V.maxCaras + 4) pistas.push(nuevaPista(c, ahora));
      }
    }
  }

  function nuevaPista(c, ahora) {
    const p = {
      id: sigId++, cx: c.cx, cy: c.cy, tam: c.tam, giro: c.giro, cab: c.cab, d: null,
      aciertos: 0, fallos: 0, visto: ahora, intento: 0, nace: ahora,
      estado: 'feed', candidato: null, candDesde: 0, personaDesde: 0, graciaDada: false,
    };
    medir(p, c, ahora);
    return p;
  }

  // ---------------- CLASIFICACIÓN POR CARA ----------------
  function medir(p, c, ahora) {
    const W = video.videoWidth || 1920;
    const a = .5; // suavizado de posición
    p.cx += (c.cx - p.cx) * a; p.cy += (c.cy - p.cy) * a; p.tam += (c.tam - p.tam) * a;
    const s = V.suavizadoCara;
    p.giro = p.aciertos ? p.giro * s + c.giro * (1 - s) : c.giro;
    p.cab = p.aciertos ? p.cab * s + c.cab * (1 - s) : c.cab;
    p.aciertos++; p.fallos = 0; p.visto = ahora;

    const xN = p.cx / W;
    const giroCal = p.giro - (cal.a + cal.b * xN);
    // giro > 0: la nariz va hacia la derecha de la imagen = la persona gira a SU izquierda,
    // que (con la cámara mirando al público) es el lado del FEED. Hacia la persona es negativo.
    p.d = -giroCal * (invertido ? -1 : 1);
    p.cabCal = (p.cab - cal.c) * 3.5;

    const h = V.histeresis;
    let cand;
    if (Math.abs(giroCal) > V.umbralFuera) cand = 'fuera';
    else if (p.cabCal > V.umbralAgachado) cand = 'celular';          // mirando hacia abajo: cuenta como feed
    else if (p.estado === 'persona') cand = p.d > V.umbralPersona - h ? 'persona' : 'feed';
    else cand = p.d > V.umbralPersona + h ? 'persona' : 'feed';

    if (p.aciertos === 1) { p.estado = cand; if (cand === 'persona') p.personaDesde = ahora; return; }
    if (cand === p.estado) { p.candidato = null; return; }
    if (p.candidato !== cand) { p.candidato = cand; p.candDesde = ahora; return; }
    if (ahora - p.candDesde >= V.msParaCambiar) {
      p.estado = cand; p.candidato = null;
      if (cand === 'persona') { p.personaDesde = ahora; p.graciaDada = false; }
    }
  }

  // ---------------- MANTENIMIENTO (cada frame) ----------------
  function mantener() {
    const ahora = performance.now();
    pistas = pistas.filter((p) => ahora - p.visto < V.vidaPista * 1000 && !(p.aciertos < V.aciertosParaConfirmar && ahora - p.nace > 1500));
    // fusionar pistas duplicadas de la misma cara
    for (let i = 0; i < pistas.length; i++) for (let j = i + 1; j < pistas.length; j++) {
      const a = pistas[i], b = pistas[j];
      if (Math.hypot(a.cx - b.cx, a.cy - b.cy) < Math.min(a.tam, b.tam) * .5) { (a.nace <= b.nace ? b : a).visto = -1e9; }
    }
    pistas = pistas.filter((p) => p.visto > 0);
    // límite de caras: quedan las más grandes/confiables
    if (pistas.length > V.maxCaras) pistas = pistas.sort((a, b) => b.aciertos * b.tam - a.aciertos * a.tam).slice(0, V.maxCaras);
  }

  // pistas confirmadas, en formato común (normalizado) para el resto de la obra
  function confirmadas() {
    const W = video.videoWidth || 1920, H = video.videoHeight || 1080;
    return pistas.filter((p) => p.aciertos >= V.aciertosParaConfirmar).map((p) => ({
      id: p.id, xN: p.cx / W, yN: p.cy / H, tamN: p.tam / W,
      estado: p.estado === 'celular' ? 'feed' : p.estado, estadoReal: p.estado,
      personaDesde: p.personaDesde, ref: p, giro: p.giro, d: p.d, cab: p.cabCal,
    }));
  }

  // ---------------- CALIBRACIÓN (tecla C) ----------------
  // Todos miran el centro de la pantalla ~1.5 s. Se ajusta giroBase(x) = a + b·x
  // (la gente a los costados tiene que girar distinto para mirar el mismo punto).
  function calibrar() {
    return new Promise((resolve) => {
      const W = video.videoWidth || 1920;
      const muestras = [];
      const t0 = performance.now();
      const iv = setInterval(() => {
        for (const p of pistas) if (p.aciertos >= V.aciertosParaConfirmar) muestras.push([p.cx / W, p.giro, p.cab]);
        if (performance.now() - t0 > 1600) {
          clearInterval(iv);
          if (!muestras.length) { resolve({ ok: false }); return; }
          const n = muestras.length;
          const mx = muestras.reduce((s, m) => s + m[0], 0) / n;
          const my = muestras.reduce((s, m) => s + m[1], 0) / n;
          const mc = muestras.reduce((s, m) => s + m[2], 0) / n;
          let sxx = 0, sxy = 0;
          for (const [x, y] of muestras) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
          const dispersion = Math.sqrt(sxx / n);
          const b = dispersion > .12 ? Math.max(-1.2, Math.min(1.2, sxy / sxx)) : 0;
          cal = { a: my - b * mx, b, c: mc };
          guardarCal();
          resolve({ ok: true, caras: new Set(pistas.map((p) => p.id)).size, cal });
        }
      }, 50);
    });
  }

  function invertir() { invertido = !invertido; guardarCal(); return invertido; }
  function reiniciarPistas() { pistas = []; }

  return {
    video, cargarModelo, iniciarCamara, actualizarOpciones, paso, mantener, confirmadas, calibrar, invertir, reiniciarPistas,
    camaraActiva,
    get listo() { return listo; },
    get info() {
      return { delegado, msInferencia, inferenciasSeg, vistas: vistas.length, pistas: pistas.length, cal, invertido, error, ultimaVista,
        w: video.videoWidth, h: video.videoHeight };
    },
    get pistasCrudas() { return pistas; },
  };
}
