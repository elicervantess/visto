// =====================================================================
//  VISTO — ESCENAS DE FONDO
//  Detrás de la persona, cada frase tiene su escena (frase 1 → escena 1…).
//  Todo se dibuja en canvas con formas planas, sin imágenes.
//   · fondo(): la parte quieta, se dibuja UNA vez en un lienzo oculto.
//   · vivo():  la vida sutil (luces que parpadean, lluvia…), cada cuadro.
//  La atención de la sala (S.vis, la misma que apaga a la persona) decide
//  si la escena se ve gris, fría y desenfocada (0) o con color y nítida (1).
//  El cambio de escena es un fundido cruzado de ~1,2 s.
// =====================================================================

const W = 691, H = 704;          // tamaño de la sección de la persona (ver css)
const TRANSICION = 1.2;          // s del fundido cruzado (también en css: #escenaFondo canvas)

// ---------- utilidades ----------
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// semilla fija: la escena es igual cada vez que se dibuja
function azar(semilla) { let s = semilla; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// =====================================================================
//  ESCENA 1 — ANDÉN DE ESTACIÓN, DE NOCHE: "perdí el último tren"
//  Túnel en perspectiva, el último vagón se aleja con sus luces rojas,
//  reloj en 23:58, tablero "PARTIÓ", tubos fluorescentes (uno falla).
// =====================================================================
const anden = (() => {
  const VP = { x: 540, y: 330 };                       // punto de fuga (a la derecha de la cabeza)
  const P = (x, y, d) => [lerp(x, VP.x, d), lerp(y, VP.y, d)];  // punto a profundidad d (0 cerca, 1 fuga)
  const FONDO_D = .85;                                 // profundidad de la boca del túnel
  const tubos = [.06, .3, .5, .64, .74].map((d, i) => ({ d, falla: i === 1 }));

  function poli(g, pts, fill) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillStyle = fill; g.fill();
  }

  function fondo(g) {
    const f = FONDO_D;
    const far = { l: lerp(0, VP.x, f), r: lerp(W, VP.x, f), t: lerp(0, VP.y, f), b: lerp(H, VP.y, f) };
    const BORDE = 432;                                 // borde del andén (abajo), separa andén y vías
    const PARED_PISO = 600;                            // altura donde la pared izquierda toca el piso

    // techo
    let gr = g.createLinearGradient(0, 0, 0, far.t);
    gr.addColorStop(0, '#0b1220'); gr.addColorStop(1, '#141f30');
    poli(g, [[0, 0], [W, 0], [far.r, far.t], [far.l, far.t]], gr);
    // pared izquierda (azulejos)
    gr = g.createLinearGradient(0, 0, far.l, 0);
    gr.addColorStop(0, '#1d3138'); gr.addColorStop(1, '#16242c');
    poli(g, [[0, 0], [far.l, far.t], P(0, PARED_PISO, f), [0, PARED_PISO]], gr);
    // pared derecha (del otro lado de las vías)
    gr = g.createLinearGradient(W, 0, far.r, 0);
    gr.addColorStop(0, '#16262e'); gr.addColorStop(1, '#111c23');
    poli(g, [[W, 0], [far.r, far.t], P(W, H, f), [W, H]], gr);
    // boca del túnel: marco de concreto y el hueco negro con forma de arco
    g.fillStyle = '#26333d';
    g.fillRect(far.l - 6, far.t - 6, far.r - far.l + 12, far.b - far.t + 6);
    g.fillStyle = '#020305';
    g.beginPath();
    g.moveTo(far.l + 6, far.b); g.lineTo(far.l + 6, far.t + 34);
    g.quadraticCurveTo((far.l + far.r) / 2, far.t - 10, far.r - 6, far.t + 34);
    g.lineTo(far.r - 6, far.b); g.closePath(); g.fill();
    // piso del andén
    gr = g.createLinearGradient(0, H, 0, VP.y);
    gr.addColorStop(0, '#2b3036'); gr.addColorStop(1, '#1a1e24');
    poli(g, [[0, PARED_PISO], P(0, PARED_PISO, f), P(BORDE, H, f), [BORDE, H], [0, H]], gr);
    // foso de las vías
    gr = g.createLinearGradient(0, H, 0, VP.y);
    gr.addColorStop(0, '#0d0f13'); gr.addColorStop(1, '#07080b');
    poli(g, [[BORDE, H], P(BORDE, H, f), P(W, H, f), [W, H]], gr);

    // azulejos de la pared: líneas hacia el punto de fuga
    g.strokeStyle = 'rgba(160,210,220,.07)'; g.lineWidth = 1;
    for (let y = 40; y < PARED_PISO; y += 46) {
      const a = [0, y], b = P(0, y, f);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    for (let i = 1; i < 14; i++) {
      const d = 1 - 1 / (1 + i * .28);
      const a = P(0, 0, d), b = P(0, PARED_PISO, d);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    // cartel publicitario en la pared (apagado, solo un rectángulo pálido)
    poli(g, [P(0, 330, .05), P(0, 330, .2), P(0, 430, .2), P(0, 430, .05)], 'rgba(150,175,185,.16)');
    // basurero (a la izquierda, bajo el brazo)
    g.fillStyle = '#0c1115'; g.fillRect(28, 402, 40, 60);
    g.fillStyle = '#26303a'; g.fillRect(24, 396, 48, 8);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(48, 464, 30, 5, 0, 0, Math.PI * 2); g.fill();

    // rieles y durmientes
    g.strokeStyle = 'rgba(150,160,175,.35)'; g.lineWidth = 3;
    for (const x of [500, 640]) {
      const a = [x, H], b = P(x, H, f);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.strokeStyle = 'rgba(90,80,70,.4)';
    for (let i = 0; i < 18; i++) {
      const d = 1 - 1 / (1 + i * .22);
      if (d > f) break;
      const a = P(470, H, d), b = P(670, H, d);
      g.lineWidth = Math.max(1, 6 * (1 - d));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    // borde del andén: franja amarilla de seguridad
    poli(g, [[BORDE - 36, H], P(BORDE - 36, H, f), P(BORDE, H, f), [BORDE, H]], 'rgba(230,190,40,.75)');
    // juntas del piso
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const d = 1 - 1 / (1 + i * .3);
      const a = P(0, H, d), b = P(BORDE - 36, H, d);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }

    // tubos fluorescentes (apagados: la luz se pinta en vivo())
    for (const t of tubos) {
      const [x, y] = P(250, 0, t.d);
      const s = 1 - t.d;
      g.fillStyle = '#2a3440';
      g.fillRect(x - 70 * s, y + 10 * s, 140 * s, 9 * s);
    }

    // reloj colgado del techo (derecha)
    g.strokeStyle = '#0a0f16'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(612, 0); g.lineTo(612, 66); g.stroke();
    g.fillStyle = '#0d131b'; g.beginPath(); g.arc(612, 110, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8dde2'; g.beginPath(); g.arc(612, 110, 39, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      g.lineWidth = i % 3 ? 2 : 4;
      g.beginPath(); g.moveTo(612 + Math.sin(a) * 31, 110 - Math.cos(a) * 31); g.lineTo(612 + Math.sin(a) * 36, 110 - Math.cos(a) * 36); g.stroke();
    }
    // 23:58 (la hora y el minutero quedan fijos; el segundero va en vivo())
    const hora = (11 + 58 / 60) / 12 * Math.PI * 2, min = 58 / 60 * Math.PI * 2;
    g.lineWidth = 5; g.beginPath(); g.moveTo(612, 110); g.lineTo(612 + Math.sin(hora) * 20, 110 - Math.cos(hora) * 20); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(612, 110); g.lineTo(612 + Math.sin(min) * 30, 110 - Math.cos(min) * 30); g.stroke();

    // tablero de salidas colgado (izquierda)
    g.strokeStyle = '#0a0f16'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(40, 0); g.lineTo(40, 58); g.moveTo(150, 0); g.lineTo(150, 58); g.stroke();
    g.fillStyle = '#05070a'; g.fillRect(14, 58, 162, 70);
    g.strokeStyle = '#1c2430'; g.lineWidth = 2; g.strokeRect(14, 58, 162, 70);
  }

  // estado animado
  const motas = Array.from({ length: 16 }, (_, i) => { const r = azar(31 + i); return { x: 80 + r() * 380, y: 120 + r() * 420, v: 4 + r() * 8, f: r() * 6 }; });
  let fallo = 1, proxFallo = 2;

  function vivo(g, t, dt, vis) {
    // --- luz de los tubos (uno falla de vez en cuando) ---
    proxFallo -= dt;
    if (proxFallo <= 0) { fallo = fallo > .5 ? .08 : 1; proxFallo = fallo > .5 ? 1.5 + Math.random() * 4 : .04 + Math.random() * .14; }
    for (const tb of tubos) {
      const [x, y] = P(250, 0, tb.d);
      const s = 1 - tb.d;
      const on = tb.falla ? fallo : 1;
      // cono de luz hacia el piso
      const gr = g.createRadialGradient(x, y + 30 * s, 4, x, y + 160 * s, 300 * s);
      gr.addColorStop(0, `rgba(205,235,255,${.20 * on})`); gr.addColorStop(1, 'rgba(205,235,255,0)');
      g.fillStyle = gr; g.fillRect(x - 320 * s, y, 640 * s, 480 * s);
      // tubo
      g.fillStyle = `rgba(225,245,255,${.25 + .75 * on})`;
      g.shadowColor = '#cfeaff'; g.shadowBlur = 18 * on;
      g.fillRect(x - 66 * s, y + 12 * s, 132 * s, 5 * s);
      g.shadowBlur = 0;
    }

    // --- el último vagón se aleja hacia el túnel (ciclo de 18 s) ---
    const ciclo = t % 18;
    if (ciclo < 14) {
      const u = 1 - Math.pow(1 - ciclo / 14, 1.4);      // se frena al alejarse (perspectiva)
      const d = lerp(.58, FONDO_D + .06, u);
      const s = 1 - d;
      const [cx, by] = P(570, H, d);                    // centro del vagón, al nivel de las vías
      const ww = 250 * s, hh = 300 * s;
      const alfa = clamp((FONDO_D + .05 - d) / .08, 0, 1);
      g.save(); g.globalAlpha = alfa;
      // carrocería (parte trasera del último vagón) con borde iluminado por el andén
      g.beginPath();
      g.moveTo(cx - ww / 2, by); g.lineTo(cx - ww / 2, by - hh * .82);
      g.quadraticCurveTo(cx, by - hh * 1.04, cx + ww / 2, by - hh * .82);
      g.lineTo(cx + ww / 2, by); g.closePath();
      g.fillStyle = '#2c3a4c'; g.fill();
      g.strokeStyle = 'rgba(190,220,240,.55)'; g.lineWidth = Math.max(1, 3 * s); g.stroke();
      // franja de color del tren
      g.fillStyle = 'rgba(80,170,200,.6)';
      g.fillRect(cx - ww / 2, by - hh * .42, ww, hh * .06);
      // ventanas: dos laterales y la de la puerta (luz cálida interior)
      g.fillStyle = `rgba(255,214,150,${.55 + vis * .35})`;
      g.fillRect(cx - ww * .14, by - hh * .8, ww * .28, hh * .36);
      g.fillRect(cx - ww * .44, by - hh * .76, ww * .2, hh * .26);
      g.fillRect(cx + ww * .24, by - hh * .76, ww * .2, hh * .26);
      // enganche
      g.fillStyle = '#10161e'; g.fillRect(cx - ww * .06, by - hh * .1, ww * .12, hh * .1);
      // luces rojas
      for (const lx of [-.36, .36]) {
        const x = cx + ww * lx, y = by - hh * .2;
        const gr = g.createRadialGradient(x, y, 0, x, y, 40 * s + 8);
        gr.addColorStop(0, 'rgba(255,60,50,.9)'); gr.addColorStop(1, 'rgba(255,30,30,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 40 * s + 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(x, y, 6 * s + 1.2, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      // reflejo rojo en los rieles
      g.fillStyle = `rgba(255,50,40,${.10 * alfa * (1 - u * .6)})`;
      g.beginPath(); g.ellipse(cx, by + 8 * s, ww * .7, 10 * s + 2, 0, 0, Math.PI * 2); g.fill();
    }

    // --- segundero del reloj ---
    const seg = Math.floor(t) % 60 / 60 * Math.PI * 2;
    g.strokeStyle = '#d23a2a'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(612, 110); g.lineTo(612 + Math.sin(seg) * 33, 110 - Math.cos(seg) * 33); g.stroke();
    g.fillStyle = '#d23a2a'; g.beginPath(); g.arc(612, 110, 3, 0, Math.PI * 2); g.fill();

    // --- tablero: "23:55 TERMINAL" y "PARTIÓ" que parpadea ---
    g.font = '700 19px ui-monospace, Menlo, monospace';
    g.fillStyle = '#ffb02e'; g.shadowColor = '#ff9a00'; g.shadowBlur = 8;
    g.fillText('23:55 ÚLTIMO', 24, 84);
    if (Math.floor(t * 1.6) % 2 === 0) { g.fillStyle = '#ff4a3a'; g.fillText('   PARTIÓ', 24, 112); }
    g.shadowBlur = 0;

    // --- polvo flotando en la luz ---
    g.fillStyle = 'rgba(220,240,255,.35)';
    for (const m of motas) {
      m.y -= m.v * dt * .3; m.x += Math.sin(t * .4 + m.f) * dt * 3;
      if (m.y < 100) m.y = 560;
      g.beginPath(); g.arc(m.x, m.y, 1.3, 0, Math.PI * 2); g.fill();
    }
  }

  return { nombre: 'andén de noche', fondo, vivo, pose: 'saludo' };
})();


// ---------- piezas comunes para las escenas de calle ----------
function cielo(g, arriba, abajo, hasta) {
  const gr = g.createLinearGradient(0, 0, 0, hasta);
  gr.addColorStop(0, arriba); gr.addColorStop(1, abajo);
  g.fillStyle = gr; g.fillRect(0, 0, W, hasta);
}
// edificios lejanos con algunas ventanas encendidas
function ciudadLejana(g, semilla, base, color, ventanas) {
  const r = azar(semilla);
  let x = -10;
  while (x < W) {
    const w = 50 + r() * 90, h = 70 + r() * 170;
    g.fillStyle = color; g.fillRect(x, base - h, w, h);
    for (let vy = base - h + 12; vy < base - 14; vy += 18) for (let vx = x + 8; vx < x + w - 10; vx += 16) {
      if (r() < ventanas) { g.fillStyle = r() < .7 ? 'rgba(255,200,120,.55)' : 'rgba(180,220,255,.4)'; g.fillRect(vx, vy, 7, 9); }
    }
    x += w + 2;
  }
}
// cono de luz de un poste (se pinta en vivo para que pueda temblar)
function conoLuz(g, x, y, alto, ancho, color, a) {
  const gr = g.createRadialGradient(x, y, 4, x, y + alto * .5, alto);
  gr.addColorStop(0, color.replace('A', (.55 * a).toFixed(3))); gr.addColorStop(1, color.replace('A', '0'));
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.lineTo(x + ancho, y + alto); g.lineTo(x - ancho, y + alto); g.closePath(); g.fill();
}
function poste(g, x, yPie, yTop, haciaDerecha) {
  g.fillStyle = '#0b0e13';
  g.fillRect(x - 4, yTop, 8, yPie - yTop);
  g.strokeStyle = '#0b0e13'; g.lineWidth = 7; g.lineCap = 'round';
  const d = haciaDerecha ? 1 : -1;
  g.beginPath(); g.moveTo(x, yTop + 10); g.quadraticCurveTo(x, yTop - 14, x + d * 44, yTop - 10); g.stroke();
  g.fillStyle = '#1a1f27'; g.beginPath(); g.ellipse(x + d * 52, yTop - 6, 18, 7, 0, 0, Math.PI * 2); g.fill();
  return [x + d * 52, yTop];
}

// =====================================================================
//  ESCENA 2 — PARADERO DE BUS BAJO LA LLUVIA: "se me cayó mi billetera"
//  Poste de luz, refugio con banca y letrero BUS, charco, y en el suelo
//  una billetera abierta y un pasaje arrugado bajo la luz.
// =====================================================================
const paradero = (() => {
  const LAMP = [92, 64];
  function fondo(g) {
    cielo(g, '#070b16', '#18202e', 380);
    ciudadLejana(g, 7, 380, '#0e131c', .12);
    // pista mojada
    let gr = g.createLinearGradient(0, 380, 0, 430);
    gr.addColorStop(0, '#0c0f14'); gr.addColorStop(1, '#141820');
    g.fillStyle = gr; g.fillRect(0, 380, W, 50);
    g.fillStyle = 'rgba(255,220,120,.25)';
    for (let x = 10; x < W; x += 90) g.fillRect(x, 402, 46, 3);       // línea discontinua
    // vereda
    gr = g.createLinearGradient(0, 430, 0, H);
    gr.addColorStop(0, '#2a2e35'); gr.addColorStop(1, '#16191e');
    g.fillStyle = gr; g.fillRect(0, 430, W, H - 430);
    g.fillStyle = '#3a3f47'; g.fillRect(0, 428, W, 6);                  // sardinel
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
    for (let x = -200; x < W + 200; x += 70) { g.beginPath(); g.moveTo(x, 434); g.lineTo(x + (x - 345) * .5, H); g.stroke(); }

    // refugio del paradero (derecha)
    g.fillStyle = 'rgba(150,200,230,.10)'; g.fillRect(478, 168, 213, 250);      // vidrio
    g.strokeStyle = 'rgba(170,210,235,.25)'; g.lineWidth = 2; g.strokeRect(478, 168, 213, 250);
    g.fillStyle = '#0d1117'; g.fillRect(470, 150, 221, 20);                       // techo
    g.fillRect(476, 168, 7, 262); g.fillRect(684, 168, 7, 262);                   // postes
    // panel publicitario iluminado (se pinta su luz en vivo)
    g.fillStyle = '#1b2230'; g.fillRect(560, 190, 112, 160);
    // banca
    g.fillStyle = '#20262f'; g.fillRect(492, 366, 180, 12);
    g.fillStyle = '#0d1117'; g.fillRect(504, 378, 6, 40); g.fillRect(652, 378, 6, 40);
    // letrero de paradero
    g.fillStyle = '#0b0e13'; g.fillRect(452, 70, 6, 360);
    g.fillStyle = '#1d6fd1'; g.beginPath(); g.arc(455, 78, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillRect(440, 66, 30, 18); g.fillStyle = '#1d6fd1'; g.fillRect(443, 69, 10, 7); g.fillRect(457, 69, 10, 7);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(446, 87, 3, 0, Math.PI * 2); g.arc(464, 87, 3, 0, Math.PI * 2); g.fill();

    // poste de luz (izquierda)
    poste(g, 40, 440, 70, true);

    // charco (derecha, frente al paradero)
    g.fillStyle = 'rgba(10,14,22,.85)';
    g.beginPath(); g.ellipse(560, 470, 92, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(120,160,200,.12)';
    g.beginPath(); g.ellipse(560, 468, 80, 11, 0, 0, Math.PI * 2); g.fill();

    // billetera abierta y tarjetas (izquierda, bajo el poste)
    g.save(); g.translate(78, 478); g.rotate(-.18); g.scale(1.35, 1.35);
    g.fillStyle = '#5a3420'; g.fillRect(-30, -12, 60, 24);
    g.fillStyle = '#6e4129'; g.fillRect(-28, -10, 27, 20);
    g.fillStyle = '#d9d2c0'; g.fillRect(3, -9, 22, 14);
    g.fillStyle = '#3a8fd6'; g.fillRect(6, -6, 18, 3);
    g.restore();
    // pasaje arrugado
    g.save(); g.translate(150, 466); g.rotate(.32); g.scale(1.3, 1.3);
    g.fillStyle = '#e8dcc0';
    g.beginPath(); g.moveTo(-16, -8); g.lineTo(-4, -11); g.lineTo(15, -7); g.lineTo(17, 6); g.lineTo(2, 10); g.lineTo(-15, 7); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,60,40,.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-10, -2); g.lineTo(10, -3); g.moveTo(-9, 3); g.lineTo(6, 2); g.moveTo(-4, -11); g.lineTo(2, 10); g.stroke();
    g.restore();
  }

  const gotas = Array.from({ length: 90 }, (_, i) => { const r = azar(100 + i); return { x: r() * (W + 120), y: r() * H, v: 560 + r() * 320, l: 10 + r() * 14 }; });
  const ondas = [];
  let proxOnda = 0, auto = -1;

  function vivo(g, t, dt, vis) {
    // luz del poste (tiembla un poco) y del panel publicitario
    const temb = .92 + Math.sin(t * 23) * .03 + (Math.random() < .01 ? -.3 : 0);
    conoLuz(g, LAMP[0], LAMP[1], 430, 120, 'rgba(255,200,120,A)', temb);
    g.fillStyle = `rgba(230,240,255,${.55 + Math.sin(t * 1.3) * .03})`; g.fillRect(566, 196, 100, 148);
    g.fillStyle = 'rgba(255,90,170,.55)'; g.fillRect(578, 214, 76, 50);       // anuncio (rosado, como el feed)
    g.fillStyle = 'rgba(40,40,60,.6)'; g.fillRect(578, 276, 60, 8); g.fillRect(578, 292, 44, 8);
    // reflejo del poste en el pavimento mojado
    g.fillStyle = `rgba(255,200,120,${.10 * temb})`; g.fillRect(LAMP[0] - 10, 384, 20, 46);
    // la billetera y el pasaje brillan cuando alguien mira (los detalles "aparecen")
    const brillo = .15 + vis * .55 + Math.sin(t * 3) * .06;
    g.fillStyle = `rgba(255,230,170,${brillo * .5})`;
    g.beginPath(); g.ellipse(112, 474, 72, 16, 0, 0, Math.PI * 2); g.fill();
    // un auto pasa de vez en cuando: barrido de faros por la pista mojada
    if (auto < 0 && Math.random() < dt * .12) auto = 0;
    if (auto >= 0) {
      auto += dt * 520;
      const x = auto - 160;
      const gr = g.createRadialGradient(x, 400, 0, x, 400, 140);
      gr.addColorStop(0, 'rgba(255,245,220,.35)'); gr.addColorStop(1, 'rgba(255,245,220,0)');
      g.fillStyle = gr; g.fillRect(x - 140, 370, 280, 64);
      if (x > W + 160) auto = -1;
    }
    // ondas en el charco
    proxOnda -= dt;
    if (proxOnda <= 0) { proxOnda = .15 + Math.random() * .3; ondas.push({ x: 490 + Math.random() * 140, y: 466 + Math.random() * 8, r: 1 }); }
    g.strokeStyle = 'rgba(180,210,240,.35)'; g.lineWidth = 1;
    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i]; o.r += dt * 22;
      if (o.r > 18) { ondas.splice(i, 1); continue; }
      g.globalAlpha = 1 - o.r / 18;
      g.beginPath(); g.ellipse(o.x, o.y, o.r, o.r * .3, 0, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
    // lluvia
    g.strokeStyle = 'rgba(190,210,235,.28)'; g.lineWidth = 1.2;
    g.beginPath();
    for (const d of gotas) {
      d.y += d.v * dt; d.x -= d.v * dt * .18;
      if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 120); }
      g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * .18, d.y - d.l);
    }
    g.stroke();
  }
  return { nombre: 'paradero con lluvia', fondo, vivo, pose: 'senala' };
})();

// =====================================================================
//  ESCENA 3 — ESQUINA DE UN BARRIO DESCONOCIDO: "no conozco esta zona"
//  Calle en perspectiva, cortinas metálicas cerradas, letreros de calles
//  con nombres que no ubica, semáforo en ámbar intermitente, letrero de
//  neón que falla. Ella muestra su celular sin batería.
// =====================================================================
const esquina = (() => {
  const VP = { x: 360, y: 330 };
  const P = (x, y, d) => [lerp(x, VP.x, d), lerp(y, VP.y, d)];
  function quad(g, pts, fill) { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); }

  function fondo(g) {
    cielo(g, '#0a0a1a', '#1c1a2c', 330);
    // calle en perspectiva hacia el fondo
    const f = .9;
    quad(g, [[0, 0], [150, 0], P(150, 0, f), P(0, 0, f), P(0, H, f), [0, H]], '#151824');           // fachada izquierda
    quad(g, [[W, 0], [560, 0], P(560, 0, f), P(W, 0, f), P(W, H, f), [W, H]], '#141722');
    quad(g, [[0, H], P(0, H, f), P(W, H, f), [W, H]], '#1d2028');                                   // pista
    quad(g, [[0, H], P(0, H, f), P(170, H, f), [170, H]], '#2a2d35');                               // vereda izq
    quad(g, [[W, H], P(W, H, f), P(540, H, f), [540, H]], '#2a2d35');                               // vereda der
    // fachadas: cortinas metálicas cerradas (líneas horizontales)
    for (const [x0, lado] of [[0, -1], [W, 1]]) {
      for (const [d0, d1] of [[.05, .3], [.38, .58], [.64, .78]]) {
        const a = P(x0, 300, d0), b = P(x0, 300, d1), c = P(x0, H - 60, d1), e = P(x0, H - 60, d0);
        quad(g, [a, b, c, e], '#232733');
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
        for (let k = 1; k < 16; k++) {
          const u = k / 16;
          g.beginPath(); g.moveTo(lerp(a[0], e[0], u), lerp(a[1], e[1], u)); g.lineTo(lerp(b[0], c[0], u), lerp(b[1], c[1], u)); g.stroke();
        }
      }
    }
    // ventanas oscuras en los pisos altos
    g.fillStyle = 'rgba(0,0,0,.3)';
    for (let d = .08; d < .8; d += .14) for (const y of [70, 170]) {
      for (const x0 of [0, W]) { const p = P(x0, y, d); const s = 1 - d; g.fillRect(p[0] - (x0 ? 30 * s : 0), p[1], 30 * s, 50 * s); }
    }
    // cruce peatonal (franjas)
    g.fillStyle = 'rgba(220,220,210,.35)';
    for (let i = 0; i < 7; i++) {
      const x = 180 + i * 52;
      quad(g, [[x, H - 70], [x + 26, H - 70], P(x + 26, H - 70, .12), P(x, H - 70, .12)], 'rgba(220,220,210,.28)');
    }
    // semáforo (izquierda)
    g.fillStyle = '#0b0d12'; g.fillRect(56, 120, 8, 360);
    g.fillStyle = '#12151c'; g.fillRect(36, 60, 48, 120);
    for (const y of [80, 120, 160]) { g.fillStyle = '#05060a'; g.beginPath(); g.arc(60, y, 14, 0, Math.PI * 2); g.fill(); }
    // letreros de calles (derecha): nombres que no le dicen nada
    g.fillStyle = '#0b0d12'; g.fillRect(604, 40, 7, 440);
    g.fillStyle = '#1f7a4d'; g.fillRect(510, 72, 176, 34); g.fillRect(536, 116, 150, 34);
    g.strokeStyle = '#e8f0ea'; g.lineWidth = 2; g.strokeRect(513, 75, 170, 28); g.strokeRect(539, 119, 144, 28);
    g.fillStyle = '#e8f0ea'; g.font = '800 18px ui-sans-serif, Helvetica, Arial';
    g.fillText('JR. LAS GARZAS', 528, 96); g.fillText('CALLE 14 ▸', 560, 140);
    // basura y una caja en la vereda
    g.fillStyle = '#0f1218'; g.fillRect(560, 420, 50, 40);
    g.fillStyle = '#1a1f28'; g.beginPath(); g.ellipse(124, 452, 26, 12, 0, 0, Math.PI * 2); g.fill();
  }

  const polillas = Array.from({ length: 7 }, (_, i) => ({ f: i * 1.7, r: 14 + i * 4 }));
  let falla = 1, proxFalla = 1.5;

  function vivo(g, t, dt, vis) {
    // semáforo en ámbar intermitente: ilumina la esquina
    const ambar = Math.sin(t * Math.PI * 1.1) > 0 ? 1 : 0;
    if (ambar) {
      g.fillStyle = '#ffb21e'; g.shadowColor = '#ffa000'; g.shadowBlur = 24;
      g.beginPath(); g.arc(60, 120, 12, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
      const gr = g.createRadialGradient(60, 120, 0, 60, 120, 260);
      gr.addColorStop(0, 'rgba(255,170,30,.22)'); gr.addColorStop(1, 'rgba(255,170,30,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 330, 400);
    }
    // farol lejano al fondo de la calle, con polillas
    const fx = VP.x + 40, fy = 250;
    conoLuz(g, fx, fy, 90, 30, 'rgba(200,220,255,A)', .7);
    g.fillStyle = 'rgba(220,230,255,.9)'; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(230,230,255,.6)';
    for (const m of polillas) { g.fillRect(fx + Math.sin(t * 3 + m.f) * m.r * .5, fy + 4 + Math.cos(t * 2.3 + m.f) * m.r * .3, 1.5, 1.5); }
    // letrero de neón vertical que falla: "HOSTAL"
    proxFalla -= dt;
    if (proxFalla <= 0) { falla = falla > .5 ? .15 : 1; proxFalla = falla > .5 ? 1 + Math.random() * 3 : .05 + Math.random() * .2; }
    g.font = '900 26px ui-sans-serif, Helvetica, Arial';
    const letras = 'HOSTAL';
    for (let i = 0; i < letras.length; i++) {
      const on = i === 3 ? falla : 1;                 // la "T" es la que falla
      g.fillStyle = `rgba(80,255,200,${.25 + .7 * on})`; g.shadowColor = '#3fffc8'; g.shadowBlur = 16 * on;
      g.fillText(letras[i], 640, 210 + i * 30);
    }
    g.shadowBlur = 0;
    // un auto cruza lejos, al fondo
    const c = (t * .09) % 1;
    if (c < .25) {
      const x = lerp(250, 470, c / .25);
      g.fillStyle = 'rgba(255,240,200,.8)'; g.beginPath(); g.arc(x, 334, 2.5, 0, Math.PI * 2); g.arc(x + 9, 334, 2.5, 0, Math.PI * 2); g.fill();
    }
  }
  return { nombre: 'esquina desconocida', fondo, vivo, pose: 'celular' };
})();

// =====================================================================
//  ESCENA 4 — VEREDA DE MADRUGADA: la gente pasa y no se detiene
//  Tiendas cerradas, teléfono público con luz, farol. Siluetas que
//  cruzan mirando su celular (la luz azul en la cara). Nadie se detiene.
// =====================================================================
const vereda = (() => {
  function fondo(g) {
    cielo(g, '#06070f', '#121426', 140);
    // muro de tiendas cerradas
    g.fillStyle = '#171a26'; g.fillRect(0, 110, W, 330);
    g.fillStyle = '#0f111a'; g.fillRect(0, 104, W, 10);
    for (const [x, w] of [[150, 170], [360, 150], [530, 150]]) {
      g.fillStyle = '#232634'; g.fillRect(x, 180, w, 250);
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
      for (let y = 186; y < 430; y += 9) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke(); }
      g.fillStyle = '#10121a'; g.fillRect(x - 4, 150, w + 8, 26);         // letrero apagado
    }
    // vereda
    const gr = g.createLinearGradient(0, 430, 0, H);
    gr.addColorStop(0, '#272a33'); gr.addColorStop(1, '#14161c');
    g.fillStyle = gr; g.fillRect(0, 430, W, H - 430);
    g.strokeStyle = 'rgba(0,0,0,.3)';
    for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 430); g.lineTo(x + (x - 345) * .6, H); g.stroke(); }
    // teléfono público (izquierda)
    g.fillStyle = '#0d2c48'; g.fillRect(14, 170, 104, 270);
    g.fillStyle = '#123a5e'; g.fillRect(14, 162, 104, 16);
    g.fillStyle = 'rgba(160,210,255,.12)'; g.fillRect(24, 190, 84, 200);
    g.fillStyle = '#0a0c10'; g.fillRect(48, 250, 36, 56);
    g.strokeStyle = '#0a0c10'; g.lineWidth = 4; g.beginPath(); g.moveTo(50, 262); g.quadraticCurveTo(36, 300, 60, 320); g.stroke();
    // farol (derecha)
    poste(g, 664, 440, 60, false);
  }

  // transeúntes: profundidad (escala), velocidad, dirección
  const gente = [
    { x: -80, v: 46, dir: 1, s: .78, y: 432, fase: 0, espera: 0 },
    { x: W + 60, v: 38, dir: -1, s: .62, y: 418, fase: 1.3, espera: 4 },
    { x: -60, v: 54, dir: 1, s: .9, y: 446, fase: 2.1, espera: 9 },
  ];

  function persona(g, p, t) {
    const s = p.s, x = p.x, y = p.y;
    const paso = Math.sin(t * 6 + p.fase);
    g.save(); g.translate(x, y); g.scale(s * p.dir, s);
    g.fillStyle = '#07080c';
    // piernas
    g.save(); g.translate(-8, -96); g.rotate(paso * .35); g.fillRect(-7, 0, 14, 96); g.restore();
    g.save(); g.translate(8, -96); g.rotate(-paso * .35); g.fillRect(-7, 0, 14, 96); g.restore();
    // cuerpo, cabeza agachada mirando el celular
    g.beginPath(); g.moveTo(-26, -100); g.lineTo(-22, -196); g.quadraticCurveTo(0, -212, 22, -196); g.lineTo(26, -100); g.closePath(); g.fill();
    g.beginPath(); g.arc(8, -222, 21, 0, Math.PI * 2); g.fill();
    // brazo hacia el celular
    g.strokeStyle = '#07080c'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(10, -186); g.lineTo(30, -150); g.lineTo(40, -182); g.stroke();
    // el celular y su luz azul en la cara
    g.fillStyle = '#bfe9ff'; g.fillRect(36, -196, 9, 15);
    const gr = g.createRadialGradient(34, -200, 0, 34, -200, 46);
    gr.addColorStop(0, 'rgba(140,210,255,.45)'); gr.addColorStop(1, 'rgba(140,210,255,0)');
    g.fillStyle = gr; g.fillRect(-12, -246, 92, 92);
    g.restore();
  }

  function vivo(g, t, dt, vis) {
    // luz del teléfono público que zumba
    const parpadeo = Math.random() < .02 ? .3 : 1;
    g.fillStyle = `rgba(150,210,255,${.16 * parpadeo})`; g.fillRect(24, 190, 84, 200);
    conoLuz(g, 612, 54, 420, 130, 'rgba(255,190,110,A)', .85);
    // gente que pasa sin detenerse (por detrás de ella)
    const orden = [...gente].sort((a, b) => a.s - b.s);
    for (const p of orden) {
      if (p.espera > 0) { p.espera -= dt; continue; }
      p.x += p.v * p.dir * dt;
      if ((p.dir > 0 && p.x > W + 90) || (p.dir < 0 && p.x < -90)) {
        p.dir = Math.random() < .5 ? 1 : -1; p.x = p.dir > 0 ? -90 : W + 90; p.espera = 2 + Math.random() * 5;
      }
      persona(g, p, t);
    }
  }
  return { nombre: 'vereda de madrugada', fondo, vivo, pose: 'caido' };
})();

// Escenas en el orden de las frases (CONFIG.frases): frase 1 → escena 1, etc.
export const ESCENAS = [anden, paradero, esquina, vereda];

// =====================================================================
//  CONTROLADOR: dos lienzos para el fundido cruzado
// =====================================================================
export function crearEscenas() {
  const sec = document.getElementById('persona');
  const cont = document.createElement('div');
  cont.id = 'escenaFondo';
  sec.insertBefore(cont, sec.firstChild);

  const capas = [0, 1].map(() => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cont.appendChild(cv);
    return { cv, g: cv.getContext('2d'), escena: null, fondo: null, t: 0, activa: false, apagarEn: 0 };
  });
  let frente = 0;          // capa visible
  let actual = -1;         // índice de la escena visible
  let ultimoFiltro = '';
  let reloj = 0;

  // pre-dibuja la parte quieta de una escena (una sola vez)
  const cache = new Map();
  function fondoDe(esc) {
    if (!cache.has(esc)) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      esc.fondo(c.getContext('2d'));
      cache.set(esc, c);
    }
    return cache.get(esc);
  }

  function mostrar(i) {
    if (i === actual) return;
    actual = i;
    const esc = ESCENAS[i] || null;
    const viejo = capas[frente];
    frente = 1 - frente;
    const nuevo = capas[frente];
    nuevo.escena = esc; nuevo.fondo = esc ? fondoDe(esc) : null; nuevo.t = 0; nuevo.activa = !!esc;
    nuevo.g.clearRect(0, 0, W, H);
    if (esc) { nuevo.g.drawImage(nuevo.fondo, 0, 0); }
    nuevo.cv.style.opacity = esc ? '1' : '0';
    viejo.cv.style.opacity = '0';
    viejo.apagarEn = reloj + TRANSICION + .1;          // deja de animarla al terminar el fundido
  }

  // vis: 0 (nadie mira a la persona) .. 1 (la miran)
  function actualizar(dt, vis) {
    reloj += dt;
    for (const c of capas) {
      if (!c.activa) continue;
      if (c !== capas[frente] && reloj > c.apagarEn) { c.activa = false; continue; }
      c.t += dt;
      c.g.drawImage(c.fondo, 0, 0);
      c.escena.vivo(c.g, c.t, dt, vis);
    }
    // atención → color, calidez y foco (valores redondeados para no recalcular el filtro cada cuadro)
    const v = Math.round(clamp(vis, 0, 1) * 40) / 40;
    const filtro = `grayscale(${(1 - v) * .9}) saturate(${.7 + v * .5}) brightness(${.5 + v * .5}) blur(${((1 - v) * 4).toFixed(2)}px)`;
    if (filtro !== ultimoFiltro) { cont.style.filter = filtro; ultimoFiltro = filtro; }
  }

  return {
    mostrar, actualizar,
    get actual() { return actual; },
    get pose() { return (ESCENAS[actual] && ESCENAS[actual].pose) || 'saludo'; },
    get total() { return ESCENAS.length; },
  };
}
