// =====================================================================
//  VISTO — AUDIO
//  Todo procedural con WebAudio: ambiente de ciudad, "ping" de
//  notificación, un acorde grave de "distancia" que se enfría con la
//  indiferencia, y la voz de la persona (mp3 con lowpass, o speechSynthesis).
// =====================================================================

import { CONFIG } from './config.js';

const A = CONFIG.audio;

export function crearAudio() {
  let ctx = null;
  let maestro, busCiudad, busPing, vozGain, vozFiltro, analizador;
  let distGain, distFiltro, distTercera = [], distDesafinadas = [];
  const buffersVoz = [];      // AudioBuffer por fase (si existen voz1..4.mp3)
  let fuenteVoz = null;
  let hablando = false;
  let utterance = null;
  let vozTTS = null;
  let ultimoPing = 0;
  let visibilidad = 1;
  let callbacks = {};
  let silenciado = false;
  const datosAnal = new Uint8Array(256);

  // ---------- inicialización (requiere un gesto del usuario) ----------
  function iniciar() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maestro = ctx.createGain(); maestro.gain.value = A.maestro;
    // compresor suave para que nada sature en la sala
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    maestro.connect(comp).connect(ctx.destination);

    // --- ambiente de ciudad: ruido marrón filtrado + "tráfico" que respira ---
    const ruido = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    let ult = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; ult = (ult + .02 * w) / 1.02; d[i] = ult * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = ruido; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    busCiudad = ctx.createGain(); busCiudad.gain.value = 0;
    src.connect(lp).connect(busCiudad).connect(maestro);
    src.start();
    // segunda capa: rumor de autos lejanos (bandpass con LFO de volumen)
    const src2 = ctx.createBufferSource(); src2.buffer = ruido; src2.loop = true; src2.playbackRate.value = 1.7;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7;
    const g2 = ctx.createGain(); g2.gain.value = .25;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
    const lfoG = ctx.createGain(); lfoG.gain.value = .2;
    lfo.connect(lfoG).connect(g2.gain); lfo.start();
    src2.connect(bp).connect(g2).connect(busCiudad); src2.start();

    // --- ping de notificación ---
    busPing = ctx.createGain(); busPing.gain.value = A.ping;
    busPing.connect(maestro);

    // --- "distancia": acorde grave y suave (no estresa, pero se siente frío) ---
    // Cuando la miran: acorde MAYOR, afinado, abierto y cálido.
    // Cuando la sala la ignora: la tercera baja a MENOR, las voces se desafinan
    // (batido lento), el filtro se cierra (suena "detrás de un vidrio") y un eco
    // lo aleja. Es el sonido de que alguien queda lejos, no una alarma.
    distFiltro = ctx.createBiquadFilter(); distFiltro.type = 'lowpass'; distFiltro.frequency.value = 1600; distFiltro.Q.value = .4;
    distGain = ctx.createGain(); distGain.gain.value = 0;
    const respira = ctx.createGain(); respira.gain.value = 1;
    const lfoD = ctx.createOscillator(); lfoD.frequency.value = .09;   // respira cada ~11 s
    const lfoDG = ctx.createGain(); lfoDG.gain.value = .35;
    lfoD.connect(lfoDG).connect(respira.gain); lfoD.start();
    const eco = ctx.createDelay(2); eco.delayTime.value = .48;
    const ecoFb = ctx.createGain(); ecoFb.gain.value = .38;
    const ecoLp = ctx.createBiquadFilter(); ecoLp.type = 'lowpass'; ecoLp.frequency.value = 700;
    distFiltro.connect(respira).connect(distGain).connect(maestro);
    distGain.connect(eco).connect(ecoLp).connect(ecoFb).connect(eco);
    ecoLp.connect(maestro);
    for (const [f, tipo, vol, esTercera] of [[110, 'triangle', .5, false], [164.81, 'sine', .32, false], [277.18, 'sine', .22, true], [220, 'sine', .18, false]]) {
      for (const lado of [-1, 1]) {
        const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = vol * .5;
        o.connect(g).connect(distFiltro); o.start();
        if (esTercera) distTercera.push(o);
        distDesafinadas.push([o, lado]);
      }
    }

    // --- cadena de la voz (para mp3): filtro lowpass + ganancia ---
    vozFiltro = ctx.createBiquadFilter(); vozFiltro.type = 'lowpass'; vozFiltro.frequency.value = A.lowpassAbierto; vozFiltro.Q.value = .8;
    vozGain = ctx.createGain(); vozGain.gain.value = A.voz;
    analizador = ctx.createAnalyser(); analizador.fftSize = 512;
    vozFiltro.connect(vozGain).connect(analizador).connect(maestro);

    cargarVoces();
    elegirVozTTS();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = elegirVozTTS;
  }

  // ---------- mp3 opcionales: se detectan por el listado de la carpeta ----------
  // (así no aparecen errores 404 en consola si no existen)
  async function cargarVoces() {
    try {
      // se piden directo (funciona en cualquier hosting estático, sin listado de carpeta)
      await Promise.all(CONFIG.vozArchivos.map(async (ruta, i) => {
        try {
          const r = await fetch(ruta);
          if (!r.ok) return;
          buffersVoz[i] = await ctx.decodeAudioData(await r.arrayBuffer());
        } catch (e) { /* esa voz no está: speechSynthesis */ }
      }));
      const n = buffersVoz.filter(Boolean).length;
      if (n) console.info(`[VISTO] voces mp3 cargadas: ${n}/4`);
    } catch (e) { /* sin mp3: se usa speechSynthesis */ }
  }

  function elegirVozTTS() {
    if (!('speechSynthesis' in window)) return;
    const voces = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(CONFIG.vozIdioma));
    const preferidas = ['Paulina', 'Mónica', 'Monica', 'Marisol', 'Angélica', 'Sabina', 'Helena', 'Google español'];
    vozTTS = voces.find((v) => preferidas.some((p) => v.name.includes(p)) && v.localService)
      || voces.find((v) => v.localService) || voces[0] || null;
  }

  // ---------- API ----------
  function ping(fuerte = 1) {
    if (!ctx || silenciado) return;
    const ahora = ctx.currentTime;
    if (ahora - ultimoPing < .12) return;
    ultimoPing = ahora;
    const base = [1568, 1760, 2093, 1319][(Math.random() * 4) | 0];
    [[base, 1], [base * 1.5, .5]].forEach(([f, a], i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      const t0 = ahora + i * .07;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(a * fuerte, t0 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + .45);
      o.connect(g).connect(busPing);
      o.start(t0); o.stop(t0 + .5);
    });
  }

  // latido grave y cálido para el momento de gracia
  function latido() {
    if (!ctx) return;
    const ahora = ctx.currentTime;
    [0, .28].forEach((dt) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, ahora + dt);
      o.frequency.exponentialRampToValueAtTime(48, ahora + dt + .25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ahora + dt); g.gain.linearRampToValueAtTime(.35, ahora + dt + .02);
      g.gain.exponentialRampToValueAtTime(.0001, ahora + dt + .4);
      o.connect(g).connect(maestro); o.start(ahora + dt); o.stop(ahora + dt + .45);
    });
  }

  // v: visibilidad de la persona (0..1), indiferencia: 0..1, enShow: bool
  function actualizar(v, indiferencia, enShow) {
    if (!ctx) return;
    visibilidad = v;
    const t = ctx.currentTime;
    const on = enShow && !silenciado;
    busCiudad.gain.setTargetAtTime(on ? A.ciudad : 0, t, .5);
    // distancia: siempre suave; crece y se enfría con la indiferencia
    const ind = Math.max(0, Math.min(1, indiferencia));
    distGain.gain.setTargetAtTime(on ? A.distanciaMax * (.3 + .7 * ind) : 0, t, 1.2);
    distFiltro.frequency.setTargetAtTime(1600 * Math.pow(A.distanciaFiltroMin / 1600, ind), t, 1.5);
    for (const o of distTercera) o.frequency.setTargetAtTime(277.18 + (261.63 - 277.18) * ind, t, 2);   // mayor → menor
    for (const [o, lado] of distDesafinadas) o.detune.setTargetAtTime(lado * (2 + ind * A.distanciaDesafine), t, 2);
    // voz: volumen y "amortiguado" según cuánto la miran
    const vol = A.vozMinima + (1 - A.vozMinima) * v;
    vozGain.gain.setTargetAtTime(A.voz * vol, t, .25);
    const f = A.lowpassCerrado * Math.pow(A.lowpassAbierto / A.lowpassCerrado, v);
    vozFiltro.frequency.setTargetAtTime(f, t, .25);
  }

  // nivel de la voz en este instante (para mover la boca) — 0 si es TTS
  function nivelVoz() {
    if (!fuenteVoz || !analizador) return 0;
    analizador.getByteTimeDomainData(datosAnal);
    let s = 0;
    for (let i = 0; i < datosAnal.length; i++) { const x = (datosAnal[i] - 128) / 128; s += x * x; }
    return Math.min(1, Math.sqrt(s / datosAnal.length) * 6);
  }

  // dice la frase de una fase. cb: { inicio(), palabra(i), fin() }
  function decir(fase, texto, cb = {}) {
    if (!ctx || silenciado) return false;
    callbacks = cb;
    detenerVoz();
    hablando = true;
    if (buffersVoz[fase]) {
      const s = ctx.createBufferSource(); s.buffer = buffersVoz[fase];
      s.connect(vozFiltro);
      fuenteVoz = s;
      const n = texto.split(' ').length;
      const dur = s.buffer.duration;
      cb.inicio && cb.inicio();
      // subtítulo: revela palabras proporcional al tiempo del mp3
      const t0 = performance.now();
      const iv = setInterval(() => {
        const p = (performance.now() - t0) / 1000 / dur;
        cb.palabra && cb.palabra(Math.min(n - 1, Math.floor(p * n * 1.1)));
        if (p >= 1) clearInterval(iv);
      }, 60);
      s.onended = () => { clearInterval(iv); if (fuenteVoz === s) { fuenteVoz = null; hablando = false; cb.fin && cb.fin(); } };
      s.start();
      return true;
    }
    if (!('speechSynthesis' in window)) {
      // sin voz disponible: solo subtítulo con duración estimada
      cb.inicio && cb.inicio(); cb.palabra && cb.palabra(99);
      setTimeout(() => { hablando = false; cb.fin && cb.fin(); }, 2600);
      return true;
    }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = vozTTS ? vozTTS.lang : 'es-MX';
    if (vozTTS) u.voice = vozTTS;
    u.rate = .9 - (1 - visibilidad) * .08;
    u.pitch = 1.05;
    // speechSynthesis no pasa por WebAudio: el volumen se fija al inicio de cada frase
    u.volume = Math.max(.05, A.vozMinima + (1 - A.vozMinima) * visibilidad) * A.maestro;
    const palabrasIdx = [];
    let acc = 0;
    texto.split(' ').forEach((w) => { palabrasIdx.push(acc); acc += w.length + 1; });
    u.onstart = () => cb.inicio && cb.inicio();
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      let i = 0; while (i + 1 < palabrasIdx.length && palabrasIdx[i + 1] <= e.charIndex) i++;
      cb.palabra && cb.palabra(i);
    };
    const fin = () => { if (utterance === u) { utterance = null; hablando = false; cb.palabra && cb.palabra(99); cb.fin && cb.fin(); } };
    u.onend = fin; u.onerror = fin;
    utterance = u;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    // por si el motor no emite "boundary": revela todo tras un momento
    setTimeout(() => { if (utterance === u) cb.palabra && cb.palabra(99); }, 3500);
    // perro guardián: Chrome a veces no dispara onend; la persona nunca debe quedar muda
    setTimeout(() => { if (utterance === u) { speechSynthesis.cancel(); fin(); } }, 2500 + texto.length * 140);
    return true;
  }

  function detenerVoz() {
    if (fuenteVoz) { try { fuenteVoz.onended = null; fuenteVoz.stop(); } catch (e) { } fuenteVoz = null; }
    if (utterance) { utterance = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    hablando = false;
  }

  function silenciar(b) {
    silenciado = b;
    if (b) detenerVoz();
    if (ctx) maestro.gain.setTargetAtTime(b ? 0 : A.maestro, ctx.currentTime, .05);
  }

  function setMaestro(v) { A.maestro = v; if (ctx && !silenciado) maestro.gain.setTargetAtTime(v, ctx.currentTime, .1); }

  return {
    iniciar, ping, latido, actualizar, decir, detenerVoz, nivelVoz, silenciar, setMaestro,
    get hablando() { return hablando; },
    get listo() { return !!ctx && ctx.state === 'running'; },
    get usaMp3() { return buffersVoz.filter(Boolean).length; },
  };
}
