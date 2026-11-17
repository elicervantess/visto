// =====================================================================
//  VISTO — CONFIG
//  Todo lo ajustable de la obra vive aquí: tiempos, umbrales, colores,
//  frases y textos. Cambia valores aquí, no en el resto del código.
// =====================================================================

export const CONFIG = {
  // ---------------- TIEMPOS ----------------
  duracionTotal: 40,           // tope de seguridad: el final llega apenas termina la 4ª frase
  duracionFase: 10,            // 4 fases de 10 s
  sobrecargaDesde: 30,        // segundo en que el feed entra en "sobrecarga"
  apagonAntesDelFinal: 1.6,    // segundos de negro y silencio antes de la revelación

  // ---------------- ATENCIÓN ----------------
  // Proporción "mirando el feed" que se asume cuando no se detecta a nadie
  // (concepto: si nadie la mira, el feed gana por defecto).
  proporcionSalaVacia: 1.0,
  suavizadoGlobal: 0.9,        // 0..1 (más alto = cambios más lentos) para la proporción de la sala
  recuperacionPersona: 0.35,   // velocidad (por segundo) con que la persona recupera color
  perdidaPersona: 0.22,        // velocidad (por segundo) con que la persona se apaga

  // ---------------- MOMENTO DE GRACIA ----------------
  graciaSegundosMirando: 3.0,  // alguien mira a la persona más de N s seguidos
  graciaCongelaFeed: 2.0,      // el feed se congela N s
  graciaEnfriamiento: 4.0,     // s mínimos entre dos momentos de gracia

  // ---------------- DETECCIÓN (valores por defecto; el panel H los ajusta) ----------------
  vision: {
    maxCaras: 8,
    camaraAncho: 1920,
    camaraAlto: 1080,
    fpsDeteccion: 15,          // inferencias por segundo (cada una procesa una "vista")
    // Modo de mosaico: "normal" = cuadro completo; "lejos" = completo + 2 mitades ampliadas;
    // "muy_lejos" = completo + 2 mitades + 4 cuadrantes (caras muy pequeñas, ~3 m o más).
    mosaico: 'lejos',
    confianzaDeteccion: 0.35,
    confianzaPresencia: 0.35,
    realceLuz: 1.25,           // brillo extra antes de detectar (poca luz)
    realceContraste: 1.15,
    // Clasificación por orientación de la cabeza ("giro" ≈ seno del ángulo de yaw, -1..1)
    umbralPersona: 0.10,       // giro hacia la derecha (tras calibrar) para contar "persona"
    umbralFuera: 0.62,         // más allá de esto (o cabeza muy agachada) no mira la pantalla
    umbralAgachado: 0.45,      // cabeceo hacia abajo que cuenta como "mirando el celular/el piso"
    histeresis: 0.04,          // margen para que el estado no parpadee
    suavizadoCara: 0.65,       // 0..1 suavizado del giro por cara
    msParaCambiar: 280,        // ms sostenidos antes de cambiar de estado
    vidaPista: 1.3,            // s que una cara "perdida" sigue contando (anti-parpadeo)
    aciertosParaConfirmar: 2,  // detecciones antes de contar a una cara nueva
    zonaArriba: 0.0,           // franja vertical de la imagen donde buscar caras (0 = arriba)
    zonaAbajo: 1.0,            // (1 = abajo). Achicarla acelera la búsqueda en salas grandes
  },

  // ---------------- EL ESPEJO (franja inferior con la cámara) ----------------
  espejo: {
    alto: 280,                 // px de la franja (de 1080). Si lo cambias, cambia también --espejoH en css/visto.css
    modo: 'claro',             // 'claro' = nítido (exposición) · 'estilizado' = duotono desenfocado. Tecla M alterna
    zoomMax: 2.0,              // cuánto puede acercarse a las caras (1 = nunca acerca)
    brilloMin: 1.0,            // ganancia de brillo automática (se ajusta a la luz de la sala)
    brilloMax: 2.2,
    contraste: 1.12,
    saturacion: 0.92,
  },

  // ---------------- COLORES ----------------
  colores: {
    fondo: '#0a0a14',
    magenta: '#ff2bd6',
    cian: '#22e6ff',
    amarillo: '#ffe14a',
    violeta: '#8b5cff',
    visto: '#3aa8ff',          // azul del "Visto" final
    piel: '#d9a07a',
  },

  // ---------------- FRASES DE LA PERSONA ----------------
  // Se turnan: cada vez que habla dice la siguiente (1→2→3→4→1…), así todas las
  // escenas aparecen varias veces. Cada frase tiene su escena en js/escenas.js.
  frases: [
    'Disculpa... perdí el último tren y no conozco esta zona. ¿Me dices cómo salgo a una avenida?',
    'Se me cayó la billetera en el bus... no tengo cómo volver a mi casa. ¿Me ayudas?',
    'Se me apagó el celular... y ese señor me mira hace rato. ¿Me prestas tu teléfono? Una llamada.',
    'Me siento mareada... nadie se detiene. Sé que me están viendo. Solo quédate conmigo un ratito.',
  ],
  pausaEntreFrases: [1.6, 1.3, 1.1, 1.0], // s de silencio entre frases, según la fase (se acelera)
  vozArchivos: ['assets/audio/voz1.mp3', 'assets/audio/voz2.mp3', 'assets/audio/voz3.mp3', 'assets/audio/voz4.mp3'],
  vozIdioma: 'es',

  // ---------------- INTENSIDAD DEL FEED POR FASE ----------------
  // velocidad: px/s de scroll; glitch: probabilidad por segundo; notis: toasts por segundo
  fases: [
    { velocidad: 70,  glitch: 0.10, notis: 0.25, particulas: 4 },
    { velocidad: 120, glitch: 0.25, notis: 0.45, particulas: 8 },
    { velocidad: 190, glitch: 0.50, notis: 0.80, particulas: 14 },
    { velocidad: 280, glitch: 0.90, notis: 1.40, particulas: 22 },
  ],
  // multiplicador extra cuando toda la sala mira el feed (el feed "se alimenta" de la atención)
  boostPorAtencion: 0.8,

  // ---------------- AUDIO (volúmenes máximos, 0..1) ----------------
  audio: {
    maestro: 0.9,
    ciudad: 0.05,
    ping: 0.08,
    distanciaMax: 0.05,        // acorde grave de "distancia" (sube con la indiferencia, nunca estridente)
    distanciaFiltroMin: 320,   // Hz: con indiferencia total suena apagado, "detrás de un vidrio"
    distanciaDesafine: 18,     // cents: cuánto se desafina con la indiferencia (batido lento)
    voz: 1.0,
    vozMinima: 0.12,           // volumen de la voz cuando nadie la mira
    lowpassAbierto: 9000,      // Hz cuando la miran
    lowpassCerrado: 420,       // Hz cuando la ignoran (voz "amortiguada")
  },

  // ---------------- TEXTOS ----------------
  textos: {
    titulo: 'VISTO',
    subtitulo: 'sentir sin actuar',
    privacidad: 'Esta obra usa la cámara para estimar hacia dónde mira la sala y se muestra en vivo en «el espejo». La imagen se procesa solo en este computador: nada se graba, se guarda ni se envía.',
    cierre: 'La indiferencia no es maldad: es atención mal repartida.',
  },
};
