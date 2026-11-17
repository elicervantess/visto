// =====================================================================
//  VISTO — FEED
//  Scroll infinito de tarjetas, contadores de likes, toasts que vibran,
//  glitch y partículas (corazones, pulgares, notificaciones) en canvas.
// =====================================================================

import { CONFIG } from './config.js';

const C = CONFIG.colores;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ---------------- CONTENIDO INVENTADO ----------------
const USUARIOS = ['vibes.daily', 'neon.mood', 'cami_glow', 'eltrendero', 'lafiebre.tv', 'memeslatam', 'gaby.fit', 'sofi.unboxing',
  'puro.hype', 'dj_karmaa', 'top10ya', 'matiasreacts', 'luz.y.filtro', 'lowcost.viajes', 'chisme_hd', 'santi.gamer', 'valeskincare', 'eldato.viral'];
const TEXTOS = [
  'No vas a creer lo que pasó al final 😱', 'POV: es lunes y ya quiero viernes', 'Este truco me cambió la vida (en serio)',
  '¿Team frío o team calor? 👇', '3 cosas que nadie te dice de…', 'Reacción en vivo 🔴 entra YA', 'Lo compré a las 3 a. m. y no me arrepiento',
  'Si lo ves, compártelo 🔁', 'Esto se volvió viral en 2 horas', 'Nadie: … Yo a las 2 a. m.:', 'Etiqueta a quien necesita ver esto',
  'Rutina de 30 segundos ✨', 'El final te va a romper 💔', 'Último día de descuento ⏰', 'Tierlist definitiva de snacks',
  'No es por presumir pero…', 'Solo los reales entienden', 'Ok pero ¿por qué nadie habla de esto?', 'Desafío: no pestañees 👀',
  'Le dije que no… y mira', 'Así quedó mi setup 🎮', 'Esto no es normal 😂😂😂', '1 millón de vistas, gracias familia 🙏',
];
const EMOJIS_IMG = ['🔥', '😱', '💸', '🍟', '🎮', '💅', '🛍️', '🐶', '🌈', '🍕', '🎧', '💄', '🚀', '😂', '🍦', '👟', '🏝️', '🧋'];
const META = ['patrocinado', 'hace 2 min', 'en vivo', 'hace 14 s', 'tendencia #1', 'para ti', 'sugerido', 'hace 1 min'];
const TOASTS = [
  ['🔔', '@cami_glow reaccionó a tu historia'], ['❤️', 'A 284 personas les gusta tu foto'], ['💬', 'Tienes 12 mensajes nuevos'],
  ['🔴', 'neon.mood inició un en vivo'], ['🔥', 'Tu racha está por terminar'], ['📈', 'Tu video está subiendo'],
  ['🛍️', '¡Oferta flash! Solo 5 min'], ['👀', '3 personas vieron tu perfil'], ['🔔', '99+ notificaciones'],
  ['⚡', 'No te pierdas esto'], ['💌', '@santi.gamer te mencionó'], ['🎁', 'Ganaste un cupón'],
];
const BORDES = [C.magenta, C.cian, C.amarillo, C.violeta];
const FONDOS_IMG = [
  [C.magenta, C.violeta], [C.cian, C.violeta], [C.amarillo, C.magenta], [C.cian, C.magenta], [C.violeta, '#ff5a5a'], [C.amarillo, C.cian],
];

// ---------------- AVATARES PROCEDURALES ----------------
// Se generan una vez en canvas y se reutilizan como dataURL.
function crearAvatares(n) {
  const out = [];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 152;
  const g = cv.getContext('2d');
  for (let i = 0; i < n; i++) {
    const [a, b] = pick(FONDOS_IMG);
    const grd = g.createLinearGradient(0, 0, 152, 152);
    grd.addColorStop(0, a); grd.addColorStop(1, b);
    g.fillStyle = grd; g.fillRect(0, 0, 152, 152);
    // silueta simple: hombros + cabeza, con tono de piel variado
    const piel = pick(['#f1c7a5', '#d9a07a', '#b97c55', '#8d5a3b', '#f5d6c0', '#6e432b']);
    const pelo = pick(['#1b1020', '#3a2416', '#f2d36b', '#c23b8b', '#10284a', '#7a3b1d']);
    g.fillStyle = pick(['#120c22', '#ffffff', '#2b1b55', '#ffe14a']);
    g.beginPath(); g.ellipse(76, 168, 62, 48, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = piel;
    g.beginPath(); g.ellipse(76, 74, 30, 36, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = pelo;
    g.beginPath(); g.ellipse(76, 52, 33, 22, 0, Math.PI, 0); g.fill();
    if (Math.random() < .5) { g.beginPath(); g.ellipse(76, 66, 36, 42, 0, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 9; g.strokeStyle = pelo; g.stroke(); }
    // lentes de sol a veces (look "influencer")
    if (Math.random() < .35) { g.fillStyle = '#111'; g.fillRect(52, 70, 20, 10); g.fillRect(80, 70, 20, 10); g.fillRect(72, 73, 8, 3); }
    out.push(cv.toDataURL('image/png'));
  }
  return out;
}

function formatear(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + ' mil';
  return n.toLocaleString('es');
}

// ---------------- SPRITES DE PARTÍCULAS ----------------
function spriteEmoji(ch, size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size * 1.6;
  const g = cv.getContext('2d');
  g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, cv.width / 2, cv.height / 2 + size * .06);
  return cv;
}
function spriteCorazonNeon(color, size) {
  const pad = size;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size + pad * 2;
  const g = cv.getContext('2d');
  g.translate(cv.width / 2, cv.height / 2);
  const s = size / 32;
  g.beginPath();
  g.moveTo(0, 10 * s);
  g.bezierCurveTo(-26 * s, -6 * s, -12 * s, -26 * s, 0, -12 * s);
  g.bezierCurveTo(12 * s, -26 * s, 26 * s, -6 * s, 0, 10 * s);
  g.shadowColor = color; g.shadowBlur = size * .7;
  g.lineWidth = 3 * s; g.strokeStyle = '#fff'; g.fillStyle = color;
  g.fill(); g.fill(); g.stroke();
  return cv;
}

// =====================================================================
export function crearFeed() {
  const feedEl = document.getElementById('feed');
  const cols = [document.getElementById('col0'), document.getElementById('col1')];
  const toastsEl = document.getElementById('toasts');
  const flashEl = document.getElementById('feedFlash');
  const fx = document.getElementById('fx');
  const g = fx.getContext('2d');
  fx.width = 1920; fx.height = 1080 - 96 - CONFIG.espejo.alto;
  const FEED_H = fx.height;

  const avatares = crearAvatares(26);
  const sprites = [
    spriteCorazonNeon(C.magenta, 44), spriteCorazonNeon('#ff4d6d', 36), spriteCorazonNeon(C.cian, 30),
    spriteEmoji('❤️', 48), spriteEmoji('👍', 48), spriteEmoji('🔔', 44), spriteEmoji('💬', 44), spriteEmoji('🔥', 46), spriteEmoji('😍', 44),
  ];

  // ---------- tarjetas ----------
  const GAP = 26;
  const columnas = cols.map((el, i) => ({ el, tarjetas: [], offset: i * 180, factor: i ? 1.22 : 1 }));

  function llenarTarjeta(t) {
    const conImg = Math.random() < .62;
    const borde = pick(BORDES);
    const [a, b] = pick(FONDOS_IMG);
    t.likes = (Math.random() < .2 ? rnd(1e5, 3e6) : rnd(80, 9e4)) | 0;
    t.el.style.setProperty('--borde', borde);
    t.el.innerHTML = `
      <div class="t-cab"><img src="${pick(avatares)}" alt="">
        <div><div class="t-user">@${pick(USUARIOS)} ${Math.random() < .4 ? '<span class="t-verif">✔</span>' : ''}</div>
        <div class="t-meta">${pick(META)}</div></div></div>
      <div class="t-txt">${pick(TEXTOS)}</div>
      ${conImg ? `<div class="t-img" style="background:linear-gradient(${(Math.random() * 360) | 0}deg,${a},${b})">${pick(EMOJIS_IMG)}</div>` : ''}
      <div class="t-pie"><span>❤️ <span class="t-likes">${formatear(t.likes)}</span></span>
        <span class="t-coment">💬 ${formatear((t.likes / rnd(8, 40)) | 0)}</span><span class="t-compartir">↗ compartir</span></div>`;
    t.likesEl = t.el.querySelector('.t-likes');
    t.h = t.el.offsetHeight;
  }

  function construir() {
    for (const col of columnas) {
      col.el.innerHTML = '';
      col.tarjetas = [];
      let y = 0;
      while (y < FEED_H + 700) {
        const el = document.createElement('div');
        el.className = 'tarjeta';
        col.el.appendChild(el);
        const t = { el, y: 0, h: 0 };
        llenarTarjeta(t);
        t.y = y;
        y += t.h + GAP;
        col.tarjetas.push(t);
      }
    }
  }

  // ---------- partículas ----------
  const parts = [];
  function emitir(x, y, n = 1, fuerza = 1) {
    for (let i = 0; i < n && parts.length < 420; i++) {
      parts.push({
        x: x + rnd(-30, 30), y: y + rnd(-10, 10),
        vx: rnd(-40, 40) * fuerza, vy: rnd(-260, -120) * fuerza,
        vida: 0, max: rnd(1.4, 2.8), s: rnd(.6, 1.25), rot: rnd(-.4, .4), vr: rnd(-1.5, 1.5),
        img: pick(sprites),
      });
    }
  }

  // ---------- toasts ----------
  const ESQUINAS = [{ left: 28, top: 22 }, { right: 28, top: 22 }, { left: 28, bottom: 22 }, { right: 28, bottom: 22 }, { left: 330, top: 300 }];
  let toastsVivos = 0;
  let onPing = () => {};
  function toast() {
    if (toastsVivos >= 6) return;
    const [ic, txt] = pick(TOASTS);
    const el = document.createElement('div');
    el.className = 'toast';
    const pos = pick(ESQUINAS);
    for (const k in pos) el.style[k] = (pos[k] + rnd(0, 40)) + 'px';
    el.style.borderColor = pick(BORDES);
    el.innerHTML = `<span class="ic">${ic}</span><span>${txt}</span>`;
    toastsEl.appendChild(el);
    toastsVivos++;
    onPing();
    setTimeout(() => { el.classList.add('sale'); }, rnd(1800, 2600));
    setTimeout(() => { if (el.isConnected) { el.remove(); toastsVivos--; } }, 3200);
  }

  // ---------- estado ----------
  let congeladoHasta = 0;
  let glitchHasta = 0;
  let tLikes = 0;
  let ultimoFiltro = '';
  let flashV = 0;

  function glitch(dur = rnd(.12, .4)) {
    glitchHasta = Math.max(glitchHasta, performance.now() / 1000 + dur);
  }

  function congelar(seg) {
    const ahora = performance.now() / 1000;
    congeladoHasta = ahora + seg;
    glitch(.5);
  }

  // ---------- actualización por frame ----------
  // p: { velocidad, glitch, notis, particulas, intensidad(0..1+), sobrecarga(0..1) }
  function actualizar(dt, p) {
    const ahora = performance.now() / 1000;
    const congelado = ahora < congeladoHasta;
    feedEl.classList.toggle('congelado', congelado);

    // scroll
    if (!congelado) {
      for (const col of columnas) {
        const v = p.velocidad * col.factor;
        for (const t of col.tarjetas) t.y -= v * dt;
        // reciclar tarjetas que salieron por arriba
        while (col.tarjetas.length && col.tarjetas[0].y + col.tarjetas[0].h < -40) {
          const t = col.tarjetas.shift();
          const ult = col.tarjetas[col.tarjetas.length - 1];
          llenarTarjeta(t);
          t.y = ult.y + ult.h + GAP;
          col.tarjetas.push(t);
        }
        for (const t of col.tarjetas) t.el.style.transform = `translate3d(0,${t.y.toFixed(1)}px,0)`;
      }
    }

    // likes que saltan (10 veces por segundo)
    tLikes += dt;
    if (tLikes > .1 && !congelado) {
      tLikes = 0;
      for (const col of columnas) for (const t of col.tarjetas) {
        if (t.y > FEED_H || t.y + t.h < 0) continue;
        if (Math.random() < .25 + p.intensidad * .5) {
          t.likes += (rnd(1, 40) * (1 + p.intensidad * 6)) | 0;
          t.likesEl.textContent = formatear(t.likes);
          if (Math.random() < .12 + p.intensidad * .2) {
            t.likesEl.classList.remove('salto'); void t.likesEl.offsetWidth; t.likesEl.classList.add('salto');
            emitir(140 + (col === columnas[0] ? 30 : 629), t.y + t.h - 40, 1 + ((p.intensidad * 2) | 0));
          }
        }
      }
    }

    // partículas ambientales desde el feed
    if (!congelado && Math.random() < p.particulas * dt) emitir(rnd(60, 1180), FEED_H + 20, 1, 1 + p.intensidad * .6);
    // en sobrecarga, se derraman hacia la persona
    if (p.sobrecarga > 0 && Math.random() < p.sobrecarga * 10 * dt) emitir(rnd(900, 1500), FEED_H + 20, 1, 1.4);

    // notificaciones
    if (!congelado && Math.random() < p.notis * dt) toast();

    // glitch aleatorio
    if (!congelado && Math.random() < p.glitch * dt) glitch();
    const enGlitch = ahora < glitchHasta;
    feedEl.classList.toggle('glitch', enGlitch);

    // brillo general del feed (siempre brillante; más con más atención)
    const brillo = 1 + p.intensidad * .22 + p.sobrecarga * .25;
    const sat = 1.05 + p.intensidad * .35;
    const filtro = congelado ? '' : `brightness(${brillo.toFixed(2)}) saturate(${sat.toFixed(2)})`;
    if (!enGlitch && filtro !== ultimoFiltro) { feedEl.style.filter = filtro; ultimoFiltro = filtro; }
    if (enGlitch) ultimoFiltro = '';

    // destellos de color (la luz del feed)
    flashV = Math.max(0, flashV - dt * 2.5);
    if (Math.random() < (p.intensidad * .6 + p.sobrecarga * 3) * dt) flashV = rnd(.15, .35 + p.sobrecarga * .3);
    if (flashV > 0) flashEl.style.background = pick([C.magenta, C.cian, C.violeta, C.amarillo]);
    flashEl.style.opacity = flashV.toFixed(2);

    dibujarFx(dt, enGlitch || congelado, p);
  }

  function dibujarFx(dt, enGlitch, p) {
    g.clearRect(0, 0, fx.width, fx.height);
    // partículas
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.vida += dt;
      if (q.vida > q.max) { parts.splice(i, 1); continue; }
      q.vy += 30 * dt; q.x += q.vx * dt + Math.sin(q.vida * 4 + i) * 0.6; q.y += q.vy * dt; q.rot += q.vr * dt;
      const a = Math.min(1, q.vida * 4) * (1 - q.vida / q.max);
      g.globalAlpha = a;
      g.setTransform(q.s, 0, 0, q.s, q.x, q.y);
      g.rotate(q.rot);
      g.drawImage(q.img, -q.img.width / 2, -q.img.height / 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;

    // franjas de glitch (aberración cromática en bandas)
    if (enGlitch || Math.random() < p.sobrecarga * .3) {
      g.globalCompositeOperation = 'screen';
      const n = 3 + ((Math.random() * 6) | 0);
      for (let i = 0; i < n; i++) {
        const y = rnd(0, fx.height), h = rnd(4, 38), x = rnd(-50, 300);
        g.fillStyle = pick(['rgba(255,43,214,.35)', 'rgba(34,230,255,.35)', 'rgba(255,225,74,.25)']);
        g.fillRect(x, y, rnd(400, 1229) + (p.sobrecarga * 700), h);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  function reiniciar() {
    parts.length = 0;
    toastsEl.innerHTML = ''; toastsVivos = 0;
    congeladoHasta = 0; glitchHasta = 0;
    construir();
  }

  construir();
  return {
    actualizar, glitch, congelar, reiniciar, emitir, toast,
    set onPing(fn) { onPing = fn; },
  };
}
