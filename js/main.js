// =====================================================================
//  VISTO — PRINCIPAL
//  Une todo: estado de la obra, bucle a 60 fps, fases, momento de gracia,
//  teclas, panel de ajustes, debug, CSV y desenlace.
//
//  Secciones:
//   1. Arranque y escalado      5. Momento de gracia
//   2. Estado                   6. Voz y subtítulos
//   3. Bucle principal          7. Teclado, panel H, debug D
//   4. Atención de la sala      8. Desenlace, CSV y reinicio
// =====================================================================

import { CONFIG } from './config.js';
import { crearFeed } from './feed.js';
import { crearPersona } from './persona.js';
import { crearEscenas } from './escenas.js';
import { crearAudio } from './audio.js';
import { crearVision } from './vision.js';
import { crearEspejo } from './espejo.js';
import { crearSim } from './sim.js';
import { mostrarFinal, cancelarFinal } from './final.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('dur')) CONFIG.duracionTotal = +params.get('dur');

// ---------------- 1. ARRANQUE Y ESCALADO ----------------
const escenario = $('escenario');
function escalar() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  escenario.style.transform = `translate(${-960 * s}px, ${-540 * s}px) scale(${s})`;
}
addEventListener('resize', escalar);
escalar();

cargarAjustes();
const feed = crearFeed();
const persona = crearPersona();
const escenas = crearEscenas();
escenas.mostrar(0);
persona.pose = escenas.pose;
const audio = crearAudio();
const vision = crearVision();
const espejo = crearEspejo();
const sim = crearSim();

$('privacidad').textContent = CONFIG.textos.privacidad;
setTimeout(() => $('introTitulo').classList.add('on'), 400);

// el modelo se carga mientras se ve la pantalla de inicio
let modeloOk = false;
vision.cargarModelo()
  .then((del) => { modeloOk = true; $('estadoCarga').textContent = `detector listo (${del}) · Enter o clic en Iniciar`; })
  .catch((e) => { $('estadoCarga').textContent = 'no se pudo cargar el detector: se usará el modo respaldo'; console.warn('[VISTO] detector:', e); });

// ---------------- 2. ESTADO ----------------
const S = {
  fase: 'intro',          // intro | show | apagon | final
  t: 0,                   // segundos de show
  ratioS: CONFIG.proporcionSalaVacia,  // proporción suavizada mirando el feed
  vis: 1,                 // visibilidad de la persona (1 = color y voz plenos)
  escuchas: 0,
  maxMirada: 0,
  maxPersonas: 0,
  gracias: [],            // segundos en que hubo momento de gracia
  ultimaGracia: -99,
  graciaHasta: -1,
  serie: [],              // una fila por segundo (para el gráfico y el CSV)
  acc: null,
  respaldo: params.get('respaldo') === '1',
  teclaF: false, teclaP: false,
  proxVoz: 2.2,
  faseIdx: -1,
  conteo: { feed: 0, persona: 0 },
  nFrase: 0,              // cuántas frases lleva dichas (la siguiente es nFrase % 4)
};
window.VISTO = { S, vision, CONFIG };   // para inspección desde la consola

function nuevoAcc() { return { frames: 0, feed: 0, persona: 0, ratio: 0, nRatio: 0, ratioS: 0, vis: 0 }; }

function reiniciarEstado() {
  Object.assign(S, {
    t: 0, ratioS: CONFIG.proporcionSalaVacia, vis: 1, escuchas: 0, maxMirada: 0, maxPersonas: 0, gracias: [],
    ultimaGracia: -99, graciaHasta: -1, serie: [], acc: nuevoAcc(), proxVoz: 2.2, faseIdx: -1, nFrase: 0, terminarEn: Infinity,
  });
  escenas.mostrar(0);
  persona.pose = escenas.pose;
  $('nEscuchas').textContent = '0';
}

// ---------------- 3. BUCLE PRINCIPAL ----------------
let ultimo = performance.now();
let tDebug = 0;
const lerp = (a, b, k) => a + (b - a) * k;

function bucle(ahora) {
  const dt = Math.min(.05, (ahora - ultimo) / 1000);
  S.fps = S.fps ? S.fps * .95 + (1 / Math.max(.001, (ahora - ultimo) / 1000)) * .05 : 60;
  ultimo = ahora;

  // detección (no bloquea: el worker procesa en paralelo)
  vision.paso();
  vision.mantener();

  const enShow = S.fase === 'show';
  if (enShow) S.t += dt;

  // --- quién mira qué ---
  const usarSim = S.respaldo || S.teclaF || S.teclaP || !vision.camaraActiva();
  sim.actualizar(dt, S.teclaF, S.teclaP);
  const pistas = usarSim ? sim.pistas : vision.confirmadas();
  let nF = 0, nP = 0;
  for (const p of pistas) { if (p.estado === 'feed') nF++; else if (p.estado === 'persona') nP++; }
  S.conteo = { feed: nF, persona: nP };
  const total = nF + nP;
  const raw = total ? nF / total : null;

  // --- 4. atención de la sala (suavizado temporal) ---
  const objetivo = raw ?? CONFIG.proporcionSalaVacia;
  const k = 1 - Math.pow(CONFIG.suavizadoGlobal, dt * 10);
  S.ratioS += (objetivo - S.ratioS) * k;

  // visibilidad de la persona: se apaga si la sala mira el feed
  let objV = Math.pow(Math.max(0, 1 - S.ratioS), .6);
  const enGracia = enShow && S.t < S.graciaHasta;
  if (enGracia) objV = 1;
  if (S.fase === 'intro') objV = 1;
  const sube = enGracia ? 2.5 : CONFIG.recuperacionPersona;
  S.vis += objV > S.vis ? Math.min(objV - S.vis, sube * dt) : -Math.min(S.vis - objV, CONFIG.perdidaPersona * dt);

  if (enShow) {
    momentoDeGracia(pistas);
    registrar(nF, nP, raw, usarSim && !S.respaldo && vision.camaraActiva());
    voz();
    if (S.t >= CONFIG.duracionTotal || S.t >= S.terminarEn) iniciarFinal();
  }

  // --- intensidad del feed según fase + atención ---
  const fF = Math.min(CONFIG.fases.length - 1, Math.floor(S.t / CONFIG.duracionFase));
  const prog = (S.t % CONFIG.duracionFase) / CONFIG.duracionFase;
  const a = CONFIG.fases[fF], b = CONFIG.fases[Math.min(CONFIG.fases.length - 1, fF + 1)];
  const mult = 1 + CONFIG.boostPorAtencion * S.ratioS;
  const sobre = enShow ? Math.max(0, Math.min(1, (S.t - CONFIG.sobrecargaDesde) / (CONFIG.duracionTotal - CONFIG.sobrecargaDesde))) : 0;
  const base = S.fase === 'intro' ? { velocidad: 40, glitch: 0, notis: 0, particulas: 2 } : {
    velocidad: lerp(a.velocidad, b.velocidad, prog * .5), glitch: lerp(a.glitch, b.glitch, prog * .5),
    notis: lerp(a.notis, b.notis, prog * .5), particulas: lerp(a.particulas, b.particulas, prog * .5),
  };
  if (S.fase !== 'final' && S.fase !== 'apagon') {
    feed.actualizar(dt, {
      velocidad: base.velocidad * mult * (1 + sobre * 1.6),
      glitch: base.glitch * mult + sobre * 4,
      notis: base.notis * mult + sobre * 3,
      particulas: base.particulas * mult + sobre * 30,
      intensidad: S.ratioS * (fF + 1) / 4,
      sobrecarga: sobre,
    });
    const colores = [CONFIG.colores.magenta, CONFIG.colores.cian, CONFIG.colores.violeta];
    const ci = Math.floor(S.t * .7) % 3;
    escenas.actualizar(dt, S.vis);
    persona.actualizar(dt, S.vis, { color: hexA(colores[ci], .55), fuerza: .25 + S.ratioS * .35 + sobre * .4 });
    persona.hablando = audio.hablando;
    persona.nivelVoz = audio.nivelVoz();
    espejo.dibujar(dt, vision.video, pistas, usarSim);
    const modo = usarSim ? (S.respaldo || !vision.camaraActiva() ? 'respaldo' : 'simulación (F/P)') : espejo.modo === 'claro' ? 'cámara' : 'cámara · estilizado';
    if (modo !== S.modoTxt) { S.modoTxt = modo; $('modoTxt').textContent = modo; }
    if (S.faseIdx !== fF && enShow) actualizarPuntosFase(fF);
  }
  audio.actualizar(S.vis, S.ratioS, enShow);
  barra(nF, nP);

  // debug a ~15 fps
  tDebug += dt;
  if (debugOn && tDebug > .066) { tDebug = 0; dibujarDebug(usarSim); }

  requestAnimationFrame(bucle);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// barra superior (solo toca el DOM si algo cambió)
let ultimaBarra = '';
function barra(nF, nP) {
  const pct = Math.round(S.ratioS * 100);
  const clave = `${nF}|${nP}|${pct}`;
  if (clave === ultimaBarra) return;
  ultimaBarra = clave;
  $('nFeed').textContent = nF;
  $('nPersona').textContent = nP;
  $('indPct').textContent = pct + '%';
  $('indBarra').style.width = pct + '%';
}

function actualizarPuntosFase(f) {
  S.faseIdx = f;
  [...$('fases').children].forEach((el, i) => el.classList.toggle('on', i <= f));
  // al entrar a una fase nueva, la persona habla pronto con la frase nueva
  S.proxVoz = Math.min(S.proxVoz, S.t + .8);
}

// registro por segundo (para gráfico y CSV)
function registrar(nF, nP, raw, simForzado = false) {
  const a = S.acc || (S.acc = nuevoAcc());
  a.frames++; a.feed += nF; a.persona += nP; a.ratioS += S.ratioS; a.vis += S.vis;
  if (raw != null) { a.ratio += raw; a.nRatio++; }
  if (!simForzado) S.maxPersonas = Math.max(S.maxPersonas, nF + nP);
  if (simForzado) a.sim = true;
  if (S.t >= S.serie.length + 1) {
    const f = a.frames || 1;
    S.serie.push({
      segundo: S.serie.length + 1,
      fase: Math.min(4, Math.floor((S.serie.length) / CONFIG.duracionFase) + 1),
      feed: a.feed / f, persona: a.persona / f,
      proporcion: a.nRatio ? a.ratio / a.nRatio : '',
      suavizada: a.ratioS / f, vis: a.vis / f,
      escuchas: S.escuchas, modo: S.respaldo || !vision.camaraActiva() ? 'respaldo' : a.sim ? 'simulado_FP' : 'camara',
    });
    S.acc = nuevoAcc();
  }
}

// ---------------- 5. MOMENTO DE GRACIA ----------------
function momentoDeGracia(pistas) {
  const ahora = performance.now();
  for (const p of pistas) {
    if (p.estado !== 'persona') continue;
    const dur = (ahora - p.personaDesde) / 1000;
    S.maxMirada = Math.max(S.maxMirada, dur);
    const ref = p.ref || p;
    if (dur >= CONFIG.graciaSegundosMirando && !ref.graciaDada && S.t - S.ultimaGracia >= CONFIG.graciaEnfriamiento) {
      ref.graciaDada = true;
      S.ultimaGracia = S.t;
      S.graciaHasta = S.t + CONFIG.graciaCongelaFeed + .5;
      S.escuchas++;
      S.gracias.push(Math.floor(S.t));
      $('nEscuchas').textContent = S.escuchas;
      feed.congelar(CONFIG.graciaCongelaFeed);
      persona.latido();
      audio.latido();
    }
  }
}

// ---------------- 6. VOZ Y SUBTÍTULOS ----------------
// las frases (y sus escenas) se turnan: 1 → 2 → 3 → 4 → 1 …
function voz() {
  if (audio.hablando || S.t < S.proxVoz) return;
  if (S.nFrase >= CONFIG.frases.length) return;   // ya dijo las 4: el final llega solo
  const f = S.nFrase % CONFIG.frases.length;
  const fase = Math.min(CONFIG.pausaEntreFrases.length - 1, Math.floor(S.t / CONFIG.duracionFase));
  S.nFrase++;
  const texto = CONFIG.frases[f];
  escenas.mostrar(f);     // la escena cambia justo cuando empieza su frase (y su voz)
  persona.pose = escenas.pose;
  S.proxVoz = Infinity;   // se fija al terminar
  const ok = audio.decir(f, texto, {
    inicio: () => persona.mostrarFrase(texto),
    palabra: (i) => persona.revelarHasta(i),
    fin: () => {
      S.proxVoz = S.t + CONFIG.pausaEntreFrases[fase];
      if (S.nFrase >= CONFIG.frases.length) S.terminarEn = S.t + 1.2;   // tras la 4ª frase: ¡pum! final
    },
  });
  if (!ok) { persona.mostrarFrase(texto); persona.revelarTodo(); S.proxVoz = S.t + 4 + CONFIG.pausaEntreFrases[fase]; if (S.nFrase >= CONFIG.frases.length) S.terminarEn = S.t + 5.2; }
}

// ---------------- 7. TECLADO, PANEL H, DEBUG D ----------------
let debugOn = params.get('debug') === '1';
$('debug').classList.toggle('oculto', !debugOn);

function aviso(txt, ms = 2200) {
  const el = $('aviso');
  el.textContent = txt; el.classList.remove('oculto');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.add('oculto'), ms);
}

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const k = e.key.toLowerCase();
  if (e.repeat && (k === 'f' || k === 'p')) return;
  switch (k) {
    case 'enter': case ' ': if (S.fase === 'intro') { e.preventDefault(); iniciar(false); } break;
    case 'f': S.teclaF = true; break;
    case 'p': S.teclaP = true; break;
    case 'c': calibrar(); break;
    case 'x': aviso(vision.invertir() ? 'Izquierda/derecha INVERTIDAS' : 'Izquierda/derecha normales'); break;
    case 'h': togglePanel(); break;
    case 'd': debugOn = !debugOn; $('debug').classList.toggle('oculto', !debugOn); break;
    case 'b': S.respaldo = !S.respaldo; aviso(S.respaldo ? 'Modo respaldo: F = feed, P = persona' : 'Modo cámara'); $('modoTxt').textContent = S.respaldo ? 'respaldo' : 'cámara'; break;
    case 'e': if (S.fase === 'show') iniciarFinal(); break;
    case 'r': reiniciar(); break;
    case 'l': descargarCSV(); break;
    case 'n': siguienteEscena(); break;
    case 'm': aviso(espejo.alternarModo() === 'claro' ? 'Espejo CLARO (nítido)' : 'Espejo ESTILIZADO (duotono)'); break;
  }
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'f') S.teclaF = false;
  if (k === 'p') S.teclaP = false;
});
addEventListener('blur', () => { S.teclaF = S.teclaP = false; });

// tecla N (revisión): salta a la siguiente escena con su frase y su voz
function siguienteEscena() {
  const f = S.nFrase % CONFIG.frases.length;
  if (S.fase === 'show') {
    audio.detenerVoz();
    S.proxVoz = S.t;        // voz() muestra la escena f y dice su frase ya
  } else {
    S.nFrase++;
    escenas.mostrar(f); persona.pose = escenas.pose;
  }
  aviso(`Escena ${f + 1}/${CONFIG.frases.length}`, 1200);
}

async function calibrar() {
  if (!vision.camaraActiva()) { aviso('Sin cámara: no hay nada que calibrar'); return; }
  aviso('Calibrando… miren al CENTRO de la pantalla', 2000);
  const r = await vision.calibrar();
  aviso(r.ok ? `Calibrado con ${r.caras} cara(s) ✓` : 'No veo caras: acércate o mejora la luz y vuelve a pulsar C', 3000);
}

function dibujarDebug(usarSim) {
  const info = vision.info;
  espejo.dibujarDebug($('debugCanvas'), vision.video, vision.pistasCrudas, info, usarSim);
  $('debugTxt').textContent =
    `fps: ${S.fps.toFixed(0)}  modo: ${usarSim ? 'RESPALDO/SIM' : 'cámara'}  cam: ${info.w}x${info.h}  delegado: ${info.delegado || '-'}\n` +
    `inferencias/s: ${info.inferenciasSeg}  ms/inferencia: ${info.msInferencia.toFixed(1)}  vistas mosaico: ${info.vistas}\n` +
    `pistas: ${info.pistas}  feed: ${S.conteo.feed}  persona: ${S.conteo.persona}\n` +
    `proporción feed (suav.): ${S.ratioS.toFixed(2)}  visibilidad: ${S.vis.toFixed(2)}  t: ${S.t.toFixed(1)}s\n` +
    `calibración a=${info.cal.a.toFixed(2)} b=${info.cal.b.toFixed(2)} c=${info.cal.c.toFixed(2)}  invertido: ${info.invertido}\n` +
    (info.error ? `error: ${info.error}\n` : '') +
    `g = giro (-1..1)  d = hacia la persona (>${CONFIG.vision.umbralPersona.toFixed(2)} cuenta)  c = cabeceo`;
}

// --- panel de ajustes (H) ---
const CAMPOS = [
  ['umbralPersona', 'Umbral "mira a la persona"', 0, .5, .01],
  ['histeresis', 'Histéresis (anti-parpadeo)', 0, .15, .005],
  ['umbralFuera', 'Giro máximo (más = no mira la pantalla)', .2, 1, .01],
  ['umbralAgachado', 'Cabeceo hacia abajo = celular', .1, 1.5, .01],
  ['suavizadoCara', 'Suavizado por cara', 0, .95, .01],
  ['msParaCambiar', 'ms sostenidos para cambiar', 0, 1200, 10],
  ['vidaPista', 'Memoria de cara perdida (s)', .3, 4, .1],
  ['confianzaDeteccion', 'Confianza de detección', .1, .9, .01],
  ['realceLuz', 'Realce de luz', .8, 2.2, .05],
  ['realceContraste', 'Realce de contraste', .8, 2, .05],
  ['zonaArriba', 'Zona de búsqueda: desde (alto)', 0, .6, .01],
  ['zonaAbajo', 'Zona de búsqueda: hasta (alto)', .4, 1, .01],
  ['$suavizadoGlobal', 'Suavizado de la sala', .5, .99, .01],
  ['$maestro', 'Volumen general', 0, 1, .01],
];
const DEFAULTS = JSON.parse(JSON.stringify({ vision: CONFIG.vision, suavizadoGlobal: CONFIG.suavizadoGlobal, maestro: CONFIG.audio.maestro }));

function leer(clave) { return clave === '$suavizadoGlobal' ? CONFIG.suavizadoGlobal : clave === '$maestro' ? CONFIG.audio.maestro : CONFIG.vision[clave] ?? (clave === 'zonaAbajo' ? 1 : 0); }
function escribir(clave, v) {
  if (clave === '$suavizadoGlobal') CONFIG.suavizadoGlobal = v;
  else if (clave === '$maestro') audio.setMaestro(v);
  else CONFIG.vision[clave] = v;
}
function guardarAjustes() {
  try { localStorage.setItem('visto.ajustes', JSON.stringify({ vision: CONFIG.vision, suavizadoGlobal: CONFIG.suavizadoGlobal, maestro: CONFIG.audio.maestro })); } catch (e) { }
}
function cargarAjustes() {
  try {
    const a = JSON.parse(localStorage.getItem('visto.ajustes') || 'null');
    if (!a) return;
    Object.assign(CONFIG.vision, a.vision || {});
    if (a.suavizadoGlobal) CONFIG.suavizadoGlobal = a.suavizadoGlobal;
    if (a.maestro != null) CONFIG.audio.maestro = a.maestro;
  } catch (e) { }
}

let tOpciones = 0;
function construirPanel() {
  const cont = $('panelCampos');
  cont.innerHTML = '';
  const sel = document.createElement('div'); sel.className = 'campo';
  sel.innerHTML = `<label>Mosaico (distancia del público)</label><select id="selMosaico">
    <option value="normal">normal (hasta ~1,5 m)</option><option value="lejos">lejos (hasta ~3 m)</option><option value="muy_lejos">muy lejos (3 m o más, más lento)</option></select>`;
  cont.appendChild(sel);
  sel.querySelector('select').value = CONFIG.vision.mosaico;
  sel.querySelector('select').onchange = (e) => { CONFIG.vision.mosaico = e.target.value; vision.actualizarOpciones(); guardarAjustes(); };
  for (const [clave, nombre, min, max, paso] of CAMPOS) {
    const d = document.createElement('div'); d.className = 'campo';
    const v = leer(clave);
    d.innerHTML = `<label><span>${nombre}</span><b>${v}</b></label><input type="range" min="${min}" max="${max}" step="${paso}" value="${v}">`;
    const inp = d.querySelector('input'), b = d.querySelector('b');
    inp.oninput = () => {
      const x = +inp.value; b.textContent = x; escribir(clave, x); guardarAjustes();
      clearTimeout(tOpciones); tOpciones = setTimeout(() => vision.actualizarOpciones(), 300);
    };
    cont.appendChild(d);
  }
}
function togglePanel() {
  const p = $('panel');
  const abrir = p.classList.contains('oculto');
  if (abrir) construirPanel();
  p.classList.toggle('oculto', !abrir);
  document.body.classList.toggle('con-cursor', abrir);
}
$('pCalibrar').onclick = calibrar;
$('pInvertir').onclick = () => aviso(vision.invertir() ? 'Izquierda/derecha INVERTIDAS' : 'Izquierda/derecha normales');
$('pReset').onclick = () => {
  Object.assign(CONFIG.vision, JSON.parse(JSON.stringify(DEFAULTS.vision)));
  CONFIG.suavizadoGlobal = DEFAULTS.suavizadoGlobal; audio.setMaestro(DEFAULTS.maestro);
  guardarAjustes(); vision.actualizarOpciones(); construirPanel();
};

// ---------------- INICIO ----------------
let iniciando = false;
async function iniciar(forzarRespaldo) {
  if (iniciando || S.fase !== 'intro') return;
  iniciando = true;
  audio.iniciar();
  audio.ping(1.2);
  try { if (!document.fullscreenElement && params.get('auto') !== '1') await document.documentElement.requestFullscreen(); } catch (e) { }
  if (forzarRespaldo) S.respaldo = true;
  if (!S.respaldo && !vision.camaraActiva()) {
    $('estadoCarga').textContent = 'pidiendo cámara…';
    try {
      const r = await vision.iniciarCamara();
      console.info(`[VISTO] cámara ${r.w}x${r.h}`);
      if (!modeloOk) { S.respaldo = true; aviso('Detector no disponible: modo respaldo (F / P)', 4000); }
      else {
        let cal = null; try { cal = localStorage.getItem('visto.cal'); } catch (e) { }
        if (!cal) setTimeout(() => aviso('Consejo: pide a todos mirar al centro y pulsa C para calibrar', 4500), 1500);
      }
    } catch (e) {
      console.warn('[VISTO] cámara:', e);
      S.respaldo = true;
      aviso('Sin cámara: modo respaldo. Mantén F (feed) o P (persona)', 4500);
    }
  }
  $('modoTxt').textContent = S.respaldo ? 'respaldo' : 'cámara';
  // el título se apaga y empieza la obra
  const intro = $('intro');
  intro.style.opacity = '0';
  setTimeout(() => {
    intro.classList.add('oculto'); intro.style.opacity = '';
    reiniciarEstado();
    feed.reiniciar(); sim.reiniciar();
    S.fase = 'show';
    iniciando = false;
  }, 900);
}
$('btnIniciar').onclick = () => iniciar(false);
$('btnRespaldo').onclick = () => iniciar(true);

// ---------------- 8. DESENLACE, CSV Y REINICIO ----------------
let tApagon = 0;
function iniciarFinal() {
  if (S.fase !== 'show') return;
  S.fase = 'apagon';
  if (S.acc && S.acc.frames) registrar(S.conteo.feed, S.conteo.persona, null);   // cierra el último segundo
  audio.silenciar(true);
  $('apagon').classList.remove('oculto');
  tApagon = setTimeout(() => {
    S.fase = 'final';
    $('apagon').classList.add('oculto');
    audio.silenciar(false);
    mostrarFinal(resumen(), () => audio.ping(1.4));
  }, CONFIG.apagonAntesDelFinal * 1000);
}

function resumen() {
  const conDato = S.serie.filter((s) => s.proporcion !== '');
  const prom = conDato.length
    ? conDato.reduce((a, s) => a + s.proporcion, 0) / conDato.length
    : (S.serie.length ? S.serie.reduce((a, s) => a + s.suavizada, 0) / S.serie.length : S.ratioS);
  return { X: Math.round(prom * 100), escuchas: S.escuchas, maxMirada: S.maxMirada, maxPersonas: S.maxPersonas, serie: S.serie, gracias: S.gracias };
}

function descargarCSV() {
  if (!S.serie.length) { aviso('Aún no hay datos: inicia la obra primero'); return; }
  const r = resumen();
  const cab = 'segundo,fase,mirando_feed,mirando_persona,proporcion_feed,proporcion_feed_suavizada,visibilidad_persona,escuchas_acumuladas,modo';
  const n = (x, d = 3) => (x === '' ? '' : (+x).toFixed(d));
  const filas = S.serie.map((s) => [s.segundo, s.fase, n(s.feed, 2), n(s.persona, 2), n(s.proporcion), n(s.suavizada), n(s.vis), s.escuchas, s.modo].join(','));
  const pie = [`# indiferencia_promedio_%,${r.X}`, `# escuchas,${r.escuchas}`, `# mirada_mas_larga_s,${r.maxMirada.toFixed(2)}`, `# max_personas,${r.maxPersonas}`];
  const blob = new Blob([[cab, ...filas, ...pie].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = URL.createObjectURL(blob); a.download = `visto-atencion-${fecha}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  aviso('CSV descargado ✓');
}

function reiniciar() {
  clearTimeout(tApagon);
  cancelarFinal();
  audio.detenerVoz();
  audio.silenciar(false);
  $('apagon').classList.add('oculto');
  persona.limpiar();
  reiniciarEstado();
  feed.reiniciar(); sim.reiniciar(); vision.reiniciarPistas();
  [...$('fases').children].forEach((el) => el.classList.remove('on'));
  S.fase = 'intro';
  iniciando = false;
  const intro = $('intro');
  intro.classList.remove('oculto');
  const t = $('introTitulo'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  setTimeout(() => audio.ping(1), 300);
}

// ---------------- ARRANQUE ----------------
requestAnimationFrame((t) => { ultimo = t; requestAnimationFrame(bucle); });
if (params.get('auto') === '1') setTimeout(() => iniciar(S.respaldo), 1500);
