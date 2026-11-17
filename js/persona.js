// =====================================================================
//  VISTO — PERSONA
//  Figura humana en SVG: respira, se balancea, parpadea, levanta el brazo
//  pidiendo ayuda y mueve la boca al hablar. Se apaga a gris frío cuando
//  nadie la mira (visibilidad 0) y recupera calidez cuando la miran (1).
// =====================================================================

const SVG = `
<svg viewBox="0 0 430 520" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gPiel" cx="45%" cy="40%" r="65%">
      <stop offset="0" stop-color="#e8b28c"/><stop offset="1" stop-color="#c58762"/>
    </radialGradient>
    <linearGradient id="gSueter" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d0643f"/><stop offset="1" stop-color="#9c3f27"/>
    </linearGradient>
    <linearGradient id="gPelo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b2418"/><stop offset="1" stop-color="#22140d"/>
    </linearGradient>
  </defs>

  <g id="pCuerpo">
    <!-- pelo largo detrás -->
    <path id="pPeloAtras" fill="url(#gPelo)" d="M142 232 C128 120 304 112 290 232 L294 330 C276 352 160 352 140 330 Z"/>

    <!-- torso (suéter) -->
    <g id="pTorso">
      <path fill="#c58762" d="M194 270 L238 270 L242 360 L190 360 Z"/>
      <path fill="url(#gSueter)" d="M84 520 C84 432 104 384 156 364 Q216 346 276 364 C328 384 348 432 348 520 Z"/>
      <path fill="none" stroke="#8e3a24" stroke-width="10" stroke-linecap="round" d="M182 360 Q216 384 250 360"/>
      <path fill="none" stroke="#8e3a24" stroke-width="3" opacity=".5" d="M150 440 Q160 480 152 520 M282 440 Q272 480 280 520"/>
    </g>

    <!-- brazo levantado (gira desde el hombro) -->
    <g id="pBrazo">
      <path fill="none" stroke="url(#gSueter)" stroke-width="50" stroke-linecap="round" d="M132 392 Q90 318 84 262 Q80 212 84 176"/>
      <path fill="none" stroke="#8e3a24" stroke-width="4" opacity=".45" d="M100 270 Q118 268 126 262"/>
      <!-- mano abierta -->
      <g id="pMano" fill="#d79a72" stroke="#d79a72" stroke-linecap="round">
        <ellipse cx="86" cy="138" rx="27" ry="30" stroke="none"/>
        <path fill="none" stroke-width="12" d="M68 124 L62 84 M82 116 L80 70 M95 116 L98 72 M106 124 L112 88"/>
        <path fill="none" stroke-width="13" d="M112 148 L134 128"/>
        <path fill="#c2805a" stroke="none" d="M60 166 Q86 178 112 166 L108 182 Q86 190 64 182 Z"/>
        <!-- celular sin batería (pose "celular") -->
        <g id="pCelular" opacity="0" stroke="none">
          <rect x="66" y="84" width="42" height="76" rx="7" fill="#15151c"/>
          <rect x="70" y="90" width="34" height="62" rx="3" fill="#050507"/>
          <rect x="79" y="114" width="16" height="9" rx="1.5" fill="none" stroke="#e0473a" stroke-width="2"/>
          <rect x="95" y="116.5" width="2.5" height="4" fill="#e0473a"/>
          <rect x="81" y="116" width="3" height="5" fill="#e0473a"/>
        </g>
      </g>
    </g>

    <!-- cabeza -->
    <g id="pCabeza">
      <ellipse cx="156" cy="224" rx="12" ry="19" fill="#c58762"/>
      <ellipse cx="276" cy="224" rx="12" ry="19" fill="#c58762"/>
      <ellipse cx="216" cy="214" rx="62" ry="78" fill="url(#gPiel)"/>
      <!-- flequillo de lado -->
      <path fill="url(#gPelo)" d="M150 214 C146 150 182 126 224 128 C266 130 290 160 284 212 C276 184 260 166 236 160 C210 170 182 176 150 214 Z"/>
      <!-- cejas preocupadas -->
      <path id="pCejaI" d="M176 192 C186 184 198 182 206 186" stroke="#2a180f" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path id="pCejaD" d="M226 186 C234 182 246 184 256 192" stroke="#2a180f" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- ojos -->
      <g id="pOjos">
        <ellipse cx="192" cy="212" rx="11" ry="8" fill="#fff8f0"/>
        <ellipse cx="240" cy="212" rx="11" ry="8" fill="#fff8f0"/>
        <circle cx="193" cy="213" r="6" fill="#3a2418"/><circle cx="241" cy="213" r="6" fill="#3a2418"/>
        <circle cx="195" cy="211" r="2" fill="#fff"/><circle cx="243" cy="211" r="2" fill="#fff"/>
      </g>
      <g id="pParpados" opacity="0">
        <ellipse cx="192" cy="212" rx="12" ry="9" fill="#d29a74"/>
        <ellipse cx="240" cy="212" rx="12" ry="9" fill="#d29a74"/>
      </g>
      <!-- nariz -->
      <path d="M216 222 C212 236 210 244 218 246" stroke="#a96c4a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <!-- mejillas -->
      <ellipse cx="180" cy="246" rx="13" ry="7" fill="#e07a6a" opacity=".35"/>
      <ellipse cx="252" cy="246" rx="13" ry="7" fill="#e07a6a" opacity=".35"/>
      <!-- boca -->
      <ellipse id="pBoca" cx="216" cy="266" rx="14" ry="3" fill="#6b2a26"/>
    </g>
  </g>
</svg>`;

export function crearPersona() {
  const sec = document.getElementById('persona');
  const fig = document.getElementById('figura');
  const halo = document.getElementById('halo');
  const sub = document.getElementById('subtitulo');
  const luz = document.getElementById('luzFeed');
  fig.innerHTML = SVG;

  // capa de "frío": tiñe de azul grisáceo a la figura cuando se apaga
  const frio = document.createElement('div');
  frio.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:#4a6a96;mix-blend-mode:color;opacity:0';
  sec.insertBefore(frio, sub);

  const $ = (id) => fig.querySelector('#' + id);
  const cuerpo = $('pCuerpo'), brazo = $('pBrazo'), mano = $('pMano'), torso = $('pTorso'), cabeza = $('pCabeza');
  const parpados = $('pParpados'), boca = $('pBoca'), cejaI = $('pCejaI'), cejaD = $('pCejaD');

  let t = 0;
  let proxParpadeo = 2;
  let parpadeo = 0;
  let bocaAbierta = 0;
  let hablando = false;
  let nivelVoz = 0;        // 0..1 (amplitud real si hay mp3)
  let ultimoFiltro = '';
  let palabras = [];
  // poses (según la escena): ángulo del brazo desde el hombro, agite, inclinación de cabeza, objeto
  const POSES = {
    saludo:  { brazo: 0,    agite: 1,   cabeza: 0, celular: 0 },   // mano levantada pidiendo ayuda
    senala:  { brazo: -96,  agite: .3,  cabeza: -7, celular: 0 },  // señala el suelo: "ahí se me cayó"
    celular: { brazo: -6,   agite: .35, cabeza: -3, celular: 1 },  // muestra el celular apagado
    caido:   { brazo: 172,  agite: .1,  cabeza: 7, celular: 0 },   // brazo caído: se rinde
  };
  let poseObj = POSES.saludo;
  const pz = { brazo: 0, agite: 1, cabeza: 0, celular: 0 };       // pose actual (interpolada)
  const celular = $('pCelular');

  // ---------- subtítulos con aparición palabra a palabra ----------
  function mostrarFrase(texto) {
    // frases largas: letra más chica para que el subtítulo no tape a la persona
    sub.style.fontSize = texto.length > 140 ? '34px' : texto.length > 90 ? '39px' : '';
    sub.innerHTML = texto.split(' ').map((w) => `<span class="palabra">${w}</span>`).join(' ');
    palabras = [...sub.querySelectorAll('.palabra')];
  }
  function revelarHasta(i) {
    for (let k = 0; k < palabras.length; k++) palabras[k].classList.toggle('on', k <= i);
  }
  function revelarTodo() { revelarHasta(palabras.length); }
  function limpiar() { sub.innerHTML = ''; palabras = []; }

  function latido() {
    sec.classList.remove('latido'); void sec.offsetWidth; sec.classList.add('latido');
  }

  // v: visibilidad 0..1   luzFeed: {color, fuerza}
  function actualizar(dt, v, luzFeed) {
    t += dt;
    // respiración y balanceo
    const resp = Math.sin(t * 1.7);
    const bal = Math.sin(t * .55) * 1.4 + Math.sin(t * 1.3) * .4;
    cuerpo.setAttribute('transform', `rotate(${bal.toFixed(2)} 215 520)`);
    torso.setAttribute('transform', `translate(0 ${(-resp * 2.2).toFixed(2)}) scale(1 ${(1 + resp * .008).toFixed(4)})`);
    // la pose cambia suave (~1 s) cuando cambia la escena
    const kp = Math.min(1, dt * 2.6);
    for (const c in pz) pz[c] += (poseObj[c] - pz[c]) * kp;
    cabeza.setAttribute('transform', `translate(0 ${(-resp * 2.6).toFixed(2)}) rotate(${(Math.sin(t * .8) * 2 - 2 + pz.cabeza).toFixed(2)} 216 290)`);
    // el brazo se agita un poco más cuando la ignoran (pide más)
    const agite = (3 + (1 - v) * 6) * pz.agite;
    brazo.setAttribute('transform', `rotate(${(Math.sin(t * 2.4) * agite - 2 + pz.brazo).toFixed(2)} 132 392)`);
    mano.setAttribute('transform', `rotate(${(Math.sin(t * 4.8) * (4 + (1 - v) * 6) * pz.agite).toFixed(2)} 86 170)`);
    celular.setAttribute('opacity', pz.celular.toFixed(2));

    // parpadeo
    proxParpadeo -= dt;
    if (proxParpadeo <= 0) { parpadeo = .16; proxParpadeo = 2.5 + Math.random() * 3.5; }
    if (parpadeo > 0) parpadeo -= dt;
    parpados.setAttribute('opacity', parpadeo > 0 ? '1' : '0');

    // cejas: más preocupadas cuando la ignoran, se relajan cuando la miran
    const p = (1 - v) * 6;
    cejaI.setAttribute('d', `M176 ${192 + p * .3} C186 ${184 - p * .2} 198 ${182 - p} 206 ${186 - p * 1.2}`);
    cejaD.setAttribute('d', `M226 ${186 - p * 1.2} C234 ${182 - p} 246 ${184 - p * .2} 256 ${192 + p * .3}`);

    // boca
    const objetivo = hablando ? (nivelVoz > 0 ? nivelVoz : (Math.sin(t * 18) * .5 + .5) * (.5 + Math.random() * .5)) : 0;
    bocaAbierta += (objetivo - bocaAbierta) * Math.min(1, dt * 18);
    boca.setAttribute('ry', (3 + bocaAbierta * 9).toFixed(2));
    boca.setAttribute('rx', (14 - bocaAbierta * 3).toFixed(2));

    // desaturación hacia gris frío + transparencia
    const gris = 1 - v;
    const filtro = `grayscale(${gris.toFixed(2)}) brightness(${(.62 + v * .38).toFixed(2)}) contrast(${(.9 + v * .1).toFixed(2)})`;
    if (filtro !== ultimoFiltro) {
      fig.style.filter = filtro;
      ultimoFiltro = filtro;
    }
    fig.style.opacity = (.32 + v * .68).toFixed(3);
    halo.style.opacity = (v * v).toFixed(3);
    frio.style.opacity = (gris * .55).toFixed(3);
    sub.style.opacity = (.3 + v * .7).toFixed(3);
    sub.style.filter = v < .9 ? `blur(${((1 - v) * 2.2).toFixed(1)}px)` : '';
    sec.style.background = `radial-gradient(ellipse at 50% 45%, rgb(${(42 * v + 18 * gris) | 0},${(29 * v + 20 * gris) | 0},${(26 * v + 30 * gris) | 0}) 0%, #141018 55%, #0a0a14 100%)`;

    // la luz del feed invade la escena de la persona
    if (luzFeed) {
      luz.style.setProperty('--luz', luzFeed.color);
      luz.style.opacity = luzFeed.fuerza.toFixed(3);
    }
  }

  return {
    actualizar, latido, mostrarFrase, revelarHasta, revelarTodo, limpiar,
    set hablando(b) { hablando = b; },
    set nivelVoz(x) { nivelVoz = x; },
    set pose(nombre) { poseObj = POSES[nombre] || POSES.saludo; },
  };
}
