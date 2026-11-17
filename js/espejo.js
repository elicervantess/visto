// =====================================================================
//  VISTO — EL ESPEJO
//  La sala se ve a sí misma en la franja inferior, como en un espejo
//  (volteada horizontalmente). Dos modos, tecla M:
//   · "claro" (por defecto): video nítido, brillo automático y un recuadro
//     neón sobre cada cara (magenta = mira el feed, cian = mira a la persona).
//   · "estilizado": duotono violeta, baja resolución y desenfocado.
//  Nada se guarda: cada cuadro se dibuja y se descarta al instante.
// =====================================================================

import { CONFIG } from './config.js';

const C = CONFIG.colores;
const E = CONFIG.espejo;

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function crearEspejo() {
  const cv = document.getElementById('espejoCanvas');
  cv.width = 1920; cv.height = E.alto;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const aspecto = W / H;

  // ---- textos (DOM: se leen nítidos desde lejos y solo se tocan si cambian) ----
  const elInfo = document.getElementById('espejoInfo');
  let ultimoInfo = '';

  // ---- modo estilizado: lienzo diminuto (128 px de ancho, irreconocible) ----
  const chico = document.createElement('canvas');
  chico.width = 128; chico.height = 72;
  const gc = chico.getContext('2d', { willReadFrequently: true });
  const sombra = hexRgb('#0b0820'), luz = hexRgb('#b9a4ff');

  // ---- modo claro: medidor de luz (para el brillo automático) ----
  const medidor = document.createElement('canvas');
  medidor.width = 32; medidor.height = 18;
  const gm = medidor.getContext('2d', { willReadFrequently: true });
  let ganancia = 1.4, tMedir = 0;

  let modo = E.modo;
  let tiempo = 0;
  let bandaY = .45;                                  // modo estilizado: centro vertical de la franja
  const encuadre = { cx: .5, cy: .45, w: 1, h: 1 / aspecto * (16 / 9) };  // modo claro (normalizado a la cámara)
  const suaves = new Map();                          // posición suavizada de cada cara (id → {x,y,s})

  function alternarModo() { modo = modo === 'claro' ? 'estilizado' : 'claro'; return modo; }

  // brillo automático: mide la luminancia media cada 0,5 s y compensa salas oscuras
  function medirLuz(video) {
    gm.drawImage(video, 0, 0, medidor.width, medidor.height);
    const d = gm.getImageData(0, 0, medidor.width, medidor.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
    const media = s / (d.length / 4) / 255;
    const objetivo = clamp(.42 / Math.max(.05, media), E.brilloMin, E.brilloMax);
    ganancia = lerp(ganancia, objetivo, .35);
  }

  // ---------------- encuadre: un recorte de la cámara centrado en las caras ----------------
  // Devuelve el rectángulo fuente (px de cámara) y el destino en la franja, siempre sin estirar.
  function calcularEncuadre(dt, vw, vh, pistas) {
    const caras = pistas;                            // también las que "no miran": deben verse
    const aspCam = vw / vh;
    // tamaño mínimo del recorte (zoom máximo) y alto base (franja de ancho completo)
    const wMin = 1 / E.zoomMax;
    let obj;
    if (caras.length) {
      let x0 = 1, x1 = 0, y0 = 1, y1 = 0, sMax = 0;
      for (const p of caras) {
        const s = p.tamN;                            // tamaño de la cara (fracción del ancho)
        x0 = Math.min(x0, p.xN - s); x1 = Math.max(x1, p.xN + s);
        y0 = Math.min(y0, p.yN - s * aspCam * .9); y1 = Math.max(y1, p.yN + s * aspCam * 1.1);
        sMax = Math.max(sMax, s);
      }
      const necW = Math.max(wMin, x1 - x0 + sMax * 1.5);
      const necH = (y1 - y0) + sMax * aspCam * .4;
      // ancho del recorte en fracción del ancho; alto en fracción del alto
      let w = Math.max(necW, necH * aspecto / aspCam);
      w = Math.min(1, w);
      let h = Math.max(w * aspCam / aspecto, necH);
      h = Math.min(1, h);
      obj = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w, h };
    } else {
      obj = { cx: .5, cy: encuadre.cy, w: 1, h: aspCam / aspecto };
    }
    const k = 1 - Math.exp(-dt * 1.8);              // movimiento suave, como una cámara operada
    for (const c of ['cx', 'cy', 'w', 'h']) encuadre[c] = lerp(encuadre[c], obj[c], k);
    const sw = encuadre.w * vw, sh = encuadre.h * vh;
    const sx = clamp(encuadre.cx * vw - sw / 2, 0, vw - sw);
    const sy = clamp(encuadre.cy * vh - sh / 2, 0, vh - sh);
    const dw = Math.min(W, sw / sh * H);             // si hace falta más alto, quedan bandas a los lados
    return { sx, sy, sw, sh, dx: (W - dw) / 2, dw };
  }

  // ---------------- dibujo de un recuadro neón con su aro ----------------
  function recuadro(x, y, s, estado, alfa) {
    const persona = estado === 'persona', fuera = estado === 'fuera';
    const col = persona ? C.cian : fuera ? '#9a98b0' : C.magenta;
    const pulso = persona ? (Math.sin(tiempo * 5) * .5 + .5) : 0;
    const L = s * .26;                               // largo de las esquinas
    const x0 = x - s / 2, y0 = y - s / 2;
    g.save();
    g.globalAlpha = alfa;
    g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14;
    // recuadro fino
    g.lineWidth = 1.5; g.globalAlpha = alfa * .7;
    g.strokeRect(x0, y0, s, s);
    // esquinas gruesas
    g.globalAlpha = alfa; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0);
    g.moveTo(x0 + s - L, y0); g.lineTo(x0 + s, y0); g.lineTo(x0 + s, y0 + L);
    g.moveTo(x0 + s, y0 + s - L); g.lineTo(x0 + s, y0 + s); g.lineTo(x0 + s - L, y0 + s);
    g.moveTo(x0 + L, y0 + s); g.lineTo(x0, y0 + s); g.lineTo(x0, y0 + s - L);
    g.stroke();
    // aro (late cuando mira a la persona)
    if (!fuera) {
      g.lineWidth = 2 + pulso * 2; g.globalAlpha = alfa * (.45 + pulso * .4);
      g.beginPath(); g.arc(x, y, s * .74 + pulso * 6, 0, Math.PI * 2); g.stroke();
    }
    // etiqueta
    const txt = persona ? 'mira a la persona' : fuera ? 'no mira' : 'mira el feed';
    g.shadowBlur = 0; g.globalAlpha = alfa;
    g.font = '800 22px ui-sans-serif, "Helvetica Neue", Arial';
    const tw = g.measureText(txt).width;
    const ty = y0 - 14 < 26 ? y0 + s + 30 : y0 - 12;
    g.fillStyle = 'rgba(7,6,15,.75)';
    g.fillRect(x - tw / 2 - 8, ty - 21, tw + 16, 28);
    g.fillStyle = col;
    g.fillText(txt, x - tw / 2, ty);
    g.restore();
  }

  // aro del modo estilizado (el de antes)
  function aro(x, y, r, color, alfa, pulso) {
    g.save();
    g.globalAlpha = alfa;
    g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = 24;
    g.lineWidth = 5 + pulso * 3;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.globalAlpha = alfa * .5;
    g.beginPath(); g.arc(x, y, r + 10 + pulso * 6, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  // suaviza la posición en pantalla de cada cara (la detección llega a saltos, el dibujo va a 60 fps)
  function suavizar(p, x, y, s, dt) {
    let q = suaves.get(p.id);
    if (!q) { q = { x, y, s }; suaves.set(p.id, q); }
    const k = 1 - Math.exp(-dt * 14);
    q.x = lerp(q.x, x, k); q.y = lerp(q.y, y, k); q.s = lerp(q.s, s, k); q.vivo = tiempo;
    return q;
  }

  // ---------------- texto: "2 personas detectadas · 1 mira al feed" ----------------
  function actualizarInfo(pistas, respaldo) {
    const n = pistas.length;
    let nF = 0, nP = 0;
    for (const p of pistas) { if (p.estado === 'feed') nF++; else if (p.estado === 'persona') nP++; }
    const quien = respaldo ? (n === 1 ? 'persona simulada' : 'personas simuladas') : (n === 1 ? 'persona detectada' : 'personas detectadas');
    const html = n
      ? `<b>${n}</b> ${quien} <i>·</i> <span class="m"><b>${nF}</b> ${nF === 1 ? 'mira' : 'miran'} al feed</span> <i>·</i> <span class="c"><b>${nP}</b> ${nP === 1 ? 'mira' : 'miran'} a la persona</span>`
      : (respaldo ? 'modo respaldo · mantén F o P' : 'buscando caras…');
    if (html !== ultimoInfo) { ultimoInfo = html; elInfo.innerHTML = html; }
  }

  // video: HTMLVideoElement o null. pistas: [{id,xN,yN,tamN,estado}]. respaldo: sin cámara real
  function dibujar(dt, video, pistas, respaldo) {
    tiempo += dt;
    g.fillStyle = '#07060f'; g.fillRect(0, 0, W, H);
    const hayVideo = video && video.readyState >= 2 && !respaldo;
    actualizarInfo(pistas, respaldo);

    if (!hayVideo) { dibujarRespaldo(dt, pistas); return; }
    if (modo === 'claro') dibujarClaro(dt, video, pistas);
    else dibujarEstilizado(dt, video, pistas);
    // olvida caras que ya no están
    for (const [id, q] of suaves) if (tiempo - q.vivo > 2) suaves.delete(id);
  }

  // ---------------- MODO CLARO ----------------
  function dibujarClaro(dt, video, pistas) {
    const vw = video.videoWidth, vh = video.videoHeight;
    tMedir -= dt;
    if (tMedir <= 0) { tMedir = .5; medirLuz(video); }
    const r = calcularEncuadre(dt, vw, vh, pistas);

    g.save();
    // espejo horizontal dentro del área de video
    g.translate(r.dx + r.dw, 0); g.scale(-1, 1);
    g.filter = `brightness(${ganancia.toFixed(2)}) contrast(${E.contraste}) saturate(${E.saturacion})`;
    g.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, r.dw, H);
    g.restore();

    // toque de estilo: leve tinte violeta en las sombras y viñeta en los bordes
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = 'rgba(139,92,255,.14)'; g.fillRect(r.dx, 0, r.dw, H);
    g.restore();
    const vg = g.createLinearGradient(r.dx, 0, r.dx + r.dw, 0);
    vg.addColorStop(0, 'rgba(7,6,15,.55)'); vg.addColorStop(.12, 'rgba(7,6,15,0)');
    vg.addColorStop(.88, 'rgba(7,6,15,0)'); vg.addColorStop(1, 'rgba(7,6,15,.55)');
    g.fillStyle = vg; g.fillRect(r.dx, 0, r.dw, H);
    // scanlines muy suaves
    g.fillStyle = 'rgba(0,0,0,.10)';
    for (let y = 0; y < H; y += 4) g.fillRect(r.dx, y, r.dw, 1);
    // borde neón del área de video (cuando no ocupa todo el ancho)
    if (r.dw < W - 2) {
      g.save();
      g.strokeStyle = C.violeta; g.shadowColor = C.violeta; g.shadowBlur = 16; g.lineWidth = 2;
      g.strokeRect(r.dx + 1, 1, r.dw - 2, H - 2);
      g.restore();
    }

    // recuadros sobre las caras
    for (const p of pistas) {
      const cx = p.xN * vw, cy = p.yN * vh, s = p.tamN * vw;
      const x = r.dx + r.dw - (cx - r.sx) / r.sw * r.dw;
      const y = (cy - r.sy) / r.sh * H;
      const lado = s / r.sw * r.dw * 1.15;
      const q = suavizar(p, x, y, lado, dt);
      recuadro(q.x, q.y, Math.max(34, q.s), p.estado, p.estado === 'fuera' ? .6 : 1);
    }
  }

  // ---------------- MODO ESTILIZADO (duotono, el original) ----------------
  function dibujarEstilizado(dt, video, pistas) {
    const conCaras = pistas.filter((p) => p.estado !== 'fuera');
    if (conCaras.length) {
      const objetivo = conCaras.reduce((s, p) => s + p.yN, 0) / conCaras.length;
      bandaY += (objetivo - bandaY) * Math.min(1, dt * 1.5);
    }
    const altoBanda = (H / W) * (16 / 9);   // fracción de la altura de la cámara visible
    const y0 = Math.max(0, Math.min(1 - altoBanda, bandaY - altoBanda / 2));
    const vw = video.videoWidth, vh = video.videoHeight;
    gc.save();
    gc.translate(chico.width, 0); gc.scale(-1, 1);      // espejo
    gc.drawImage(video, 0, y0 * vh, vw, altoBanda * vh, 0, 0, chico.width, chico.height);
    gc.restore();
    const img = gc.getImageData(0, 0, chico.width, chico.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
      l = Math.min(1, Math.max(0, (l - .08) * 1.5));
      d[i] = sombra[0] + (luz[0] - sombra[0]) * l;
      d[i + 1] = sombra[1] + (luz[1] - sombra[1]) * l;
      d[i + 2] = sombra[2] + (luz[2] - sombra[2]) * l;
    }
    gc.putImageData(img, 0, 0);
    g.save();
    g.filter = 'blur(7px)';
    g.globalAlpha = .85;
    g.drawImage(chico, -10, -10, W + 20, H + 20);
    g.restore();
    for (const p of conCaras) {
      const x = (1 - p.xN) * W;
      const y = clamp((p.yN - y0) / altoBanda * H, 30, H - 30);
      const r = clamp(p.tamN * W * .75, 28, 80);
      const persona = p.estado === 'persona';
      aro(x, y, r, persona ? C.cian : C.magenta, persona ? 1 : .85, persona ? (Math.sin(tiempo * 5) * .5 + .5) : 0);
    }
  }

  // ---------------- MODO RESPALDO (sin cámara): siluetas abstractas ----------------
  function dibujarRespaldo(dt, pistas) {
    g.save();
    g.filter = 'blur(8px)';
    for (const p of pistas) {
      const x = (1 - p.xN) * W, y = H * .5;
      g.fillStyle = 'rgba(185,164,255,.32)';
      g.beginPath(); g.arc(x, y - 10, 34, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, y + 92, 70, 58, 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    for (const p of pistas) {
      if (modo === 'claro') recuadro((1 - p.xN) * W, H * .5 - 10, 96, p.estado, 1);
      else {
        const persona = p.estado === 'persona';
        aro((1 - p.xN) * W, H * .5, 52, persona ? C.cian : C.magenta, persona ? 1 : .85, persona ? (Math.sin(tiempo * 5) * .5 + .5) : 0);
      }
    }
  }

  // ---------------- DEBUG: miniatura con cajas y valores ----------------
  function dibujarDebug(dcv, video, crudas, info, respaldo) {
    const d = dcv.getContext('2d');
    const W = dcv.width, H = dcv.height;
    d.fillStyle = '#000'; d.fillRect(0, 0, W, H);
    if (video && video.readyState >= 2 && !respaldo) {
      d.save(); d.translate(W, 0); d.scale(-1, 1); d.drawImage(video, 0, 0, W, H); d.restore();
    }
    const vw = info.w || 1920, vh = info.h || 1080;
    const sx = W / vw, sy = H / vh;
    if (info.ultimaVista && !respaldo) {
      const r = info.ultimaVista;
      d.strokeStyle = 'rgba(255,225,74,.6)'; d.lineWidth = 1;
      d.strokeRect(W - (r.sx + r.sw) * sx, r.sy * sy, r.sw * sx, r.sh * sy);
    }
    d.font = '600 11px Menlo, monospace';
    for (const p of crudas) {
      const x = W - p.cx * sx, y = p.cy * sy, s = p.tam * sx;
      const col = p.estado === 'persona' ? C.cian : p.estado === 'fuera' ? '#888' : p.estado === 'celular' ? C.amarillo : C.magenta;
      d.strokeStyle = col; d.lineWidth = p.aciertos >= 2 ? 2 : 1;
      d.strokeRect(x - s / 2, y - s / 2, s, s);
      d.beginPath(); d.moveTo(x, y); d.lineTo(x + (p.d || 0) * 60, y); d.stroke();
      d.fillStyle = col;
      d.fillText(`#${p.id} ${p.estado}`, x - s / 2, y - s / 2 - 14);
      d.fillText(`g${p.giro.toFixed(2)} d${(p.d || 0).toFixed(2)} c${(p.cabCal || 0).toFixed(2)}`, x - s / 2, y - s / 2 - 3);
    }
  }

  return { dibujar, dibujarDebug, alternarModo, get modo() { return modo; } };
}
