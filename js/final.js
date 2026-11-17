// =====================================================================
//  VISTO — DESENLACE
//  "Esta sala fue X% indiferente." + escuchas + la mirada más larga +
//  gráfico de la atención en el tiempo + "Visto" (o "Escuchado").
// =====================================================================

import { CONFIG } from './config.js';

const C = CONFIG.colores;
const $ = (id) => document.getElementById(id);
let timers = [];

export function cancelarFinal() {
  timers.forEach(clearTimeout); timers = [];
  const f = $('final');
  f.classList.add('oculto');
  [...f.children].forEach((el) => el.classList.remove('ver'));
}

// resumen: { X, escuchas, maxMirada, maxPersonas, serie, gracias }
export function mostrarFinal(resumen, alPing) {
  cancelarFinal();
  const f = $('final');
  const escuchado = resumen.X < 50;
  $('fFrase').innerHTML = `Esta sala fue <em>${resumen.X}%</em> indiferente.`;
  $('fEscuchas').textContent = resumen.escuchas;
  $('fMax').textContent = resumen.maxMirada.toFixed(1).replace('.', ',') + ' s';
  $('fPersonas').textContent = resumen.maxPersonas;
  $('fVistoTxt').textContent = escuchado ? 'Escuchado' : 'Visto';
  $('fVisto').querySelector('.checks').style.display = escuchado ? 'none' : '';
  $('fVisto').style.color = escuchado ? C.cian : '';
  $('fCierre').textContent = CONFIG.textos.cierre;
  f.classList.remove('oculto');

  const pasos = [['fFrase', 200], ['f-stats', 1700], ['fGrafico', 3000], ['fVisto', 6200], ['fCierre', 8000], ['f-teclas', 9000]];
  for (const [id, ms] of pasos) {
    timers.push(setTimeout(() => {
      const el = $(id) || f.querySelector('.' + id);
      el.classList.add('ver');
      if (id === 'fGrafico') animarGrafico(resumen);
      if (id === 'fVisto' && alPing) alPing();
    }, ms));
  }
}

function animarGrafico(r) {
  const cv = $('fGrafico');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const pad = { l: 90, r: 30, t: 52, b: 46 };
  const serie = r.serie;
  const total = Math.max(serie.length, 1);
  const x = (i) => pad.l + (i / Math.max(total - 1, 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const valor = (s) => (s.proporcion === '' || s.proporcion == null ? s.suavizada : s.proporcion);
  const t0 = performance.now();
  const dur = 2600;

  function marco() {
    const p = Math.min(1, (performance.now() - t0) / dur);
    g.clearRect(0, 0, W, H);
    // ejes y guías
    g.font = '700 20px ui-sans-serif, "Helvetica Neue", Arial';
    g.fillStyle = 'rgba(255,255,255,.45)'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
    for (const v of [0, .5, 1]) {
      g.beginPath(); g.moveTo(pad.l, y(v)); g.lineTo(W - pad.r, y(v)); g.stroke();
      g.fillText(`${v * 100}%`, 18, y(v) + 7);
    }
    // fases
    const dF = CONFIG.duracionFase;
    for (let k = 1; k * dF < total; k++) {
      const xx = x(k * dF);
      g.setLineDash([6, 8]); g.beginPath(); g.moveTo(xx, pad.t); g.lineTo(xx, H - pad.b); g.stroke(); g.setLineDash([]);
    }
    for (let k = 0; k * dF < total; k++) g.fillText(`fase ${k + 1}`, x(k * dF) + 10, H - 14);

    const n = Math.max(2, Math.floor(total * p));
    // área + línea magenta: proporción que miró el feed
    g.beginPath();
    for (let i = 0; i < n && i < serie.length; i++) { const xx = x(i), yy = y(valor(serie[i])); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    const ult = Math.min(n, serie.length) - 1;
    if (ult >= 0) {
      g.save();
      g.shadowColor = C.magenta; g.shadowBlur = 18; g.strokeStyle = C.magenta; g.lineWidth = 5; g.stroke();
      g.restore();
      g.lineTo(x(ult), y(0)); g.lineTo(x(0), y(0)); g.closePath();
      const grd = g.createLinearGradient(0, pad.t, 0, H - pad.b);
      grd.addColorStop(0, 'rgba(255,43,214,.35)'); grd.addColorStop(1, 'rgba(255,43,214,0)');
      g.fillStyle = grd; g.fill();
    }
    // momentos de gracia (puntos cian)
    for (const s of r.gracias) {
      if (s > n) continue;
      g.save(); g.fillStyle = C.cian; g.shadowColor = C.cian; g.shadowBlur = 16;
      g.beginPath(); g.arc(x(s), y(.0) - 8, 9, 0, Math.PI * 2); g.fill(); g.restore();
    }
    // leyenda
    g.fillStyle = C.magenta; g.fillText('— proporción que miró el feed', pad.l, 24);
    g.fillStyle = C.cian; g.fillText('● momento de escucha', pad.l + 360, 24);
    if (p < 1) requestAnimationFrame(marco);
  }
  marco();
}
