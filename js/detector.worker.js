// =====================================================================
//  VISTO — WORKER DE DETECCIÓN
//  Corre MediaPipe Face Landmarker fuera del hilo principal para que la
//  animación se mantenga a 60 fps. Recibe recortes (ImageBitmap) de la
//  cámara y devuelve solo los puntos necesarios para estimar la
//  orientación de cada cabeza. Todo es local: nada sale del equipo.
// =====================================================================

// Worker clásico + bundle CommonJS (los module workers no soportan importScripts,
// que MediaPipe usa para cargar su wasm).
self.exports = {};
importScripts('../vendor/mediapipe/vision_bundle.js');

// Todo va dentro de una función: en un worker clásico el bundle comparte el ámbito global.
(() => {
const { FaceLandmarker, FilesetResolver } = self.exports;

let landmarker = null;
let delegado = '';
let lienzo = null, g = null;
let filtro = 'none';

// índices de la malla de 478 puntos
const NARIZ = 1, MEJ_D = 234, MEJ_I = 454, FRENTE = 10, MENTON = 152;

async function crear(op) {
  const base = new URL('../vendor/mediapipe/', self.location).href;
  const fileset = await FilesetResolver.forVisionTasks(base + 'wasm');
  const opciones = (del) => ({
    baseOptions: { modelAssetPath: base + 'face_landmarker.task', delegate: del },
    runningMode: 'IMAGE',
    numFaces: op.maxCaras,
    minFaceDetectionConfidence: op.confianzaDeteccion,
    minFacePresenceConfidence: op.confianzaPresencia,
    minTrackingConfidence: .3,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, opciones('GPU'));
    delegado = 'GPU';
  } catch (e) {
    landmarker = await FaceLandmarker.createFromOptions(fileset, opciones('CPU'));
    delegado = 'CPU';
  }
}

function procesar(bmp) {
  if (!lienzo || lienzo.width !== bmp.width || lienzo.height !== bmp.height) {
    lienzo = new OffscreenCanvas(bmp.width, bmp.height);
    g = lienzo.getContext('2d', { willReadFrequently: false });
  }
  g.filter = filtro;                 // realce para poca luz
  g.drawImage(bmp, 0, 0);
  bmp.close();
  const r = landmarker.detect(lienzo);
  const caras = [];
  for (const L of r.faceLandmarks || []) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of L) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    const pt = (i) => [L[i].x, L[i].y, L[i].z];
    caras.push({ caja: [x0, y0, x1, y1], nariz: pt(NARIZ), mejD: pt(MEJ_D), mejI: pt(MEJ_I), frente: pt(FRENTE), menton: pt(MENTON) });
  }
  return caras;
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.tipo === 'init') {
      filtro = m.filtro || 'none';
      await crear(m.opciones);
      self.postMessage({ tipo: 'listo', delegado });
    } else if (m.tipo === 'filtro') {
      filtro = m.filtro;
    } else if (m.tipo === 'opciones') {
      if (landmarker) await landmarker.setOptions({
        minFaceDetectionConfidence: m.opciones.confianzaDeteccion,
        minFacePresenceConfidence: m.opciones.confianzaPresencia,
      });
    } else if (m.tipo === 'detectar') {
      const t0 = performance.now();
      const caras = landmarker ? procesar(m.bmp) : (m.bmp.close(), []);
      self.postMessage({ tipo: 'resultado', id: m.id, caras, ms: performance.now() - t0 });
    }
  } catch (err) {
    if (m.bmp) try { m.bmp.close(); } catch (_) { }
    self.postMessage({ tipo: 'error', id: m.id, mensaje: String(err && err.message || err) });
  }
};
})();
