# VISTO — sentir sin actuar

Instalación interactiva para una pared proyectada. Un feed hiperestimulante le gana la atención a una
persona que pide ayuda. Una webcam estima **hacia dónde apunta la cabeza** de cada persona del público
(no es seguimiento de ojos) y la obra mide en vivo cuánta gente mira el feed y cuánta mira a la persona.

HTML + CSS + JS vanilla. Sin frameworks ni servicios externos. **Funciona sin internet**: MediaPipe
Face Landmarker (modelo + wasm) está en `vendor/`.

---

## 1. Cómo abrirla

**Opción A (macOS, la más fácil):** doble clic en `iniciar.command`.
Abre un servidor local y Chrome en pantalla completa, con el audio habilitado desde el inicio.
(La primera vez macOS puede pedir permiso: clic derecho → Abrir.)

**Opción B (cualquier sistema):**

```bash
cd VISTO
python3 -m http.server 8000
```

Luego abre **Google Chrome** en `http://localhost:8000` y pulsa **F11** (o ⌃⌘F en Mac) para pantalla completa.

> No abras `index.html` con doble clic (`file://`): la cámara y el detector necesitan el servidor local.
> Usa Chrome o Edge (el detector usa la GPU del navegador).

---

## 2. Teclas

| Tecla | Qué hace |
|---|---|
| **Enter** / clic en *Iniciar* | Empieza la obra (pide la cámara) |
| **C** | Calibrar: todos miran al **centro** de la pantalla ~2 s |
| **X** | Invierte izquierda/derecha (si el conteo sale al revés) |
| **D** | Debug: cámara en miniatura, cajas de caras, valores de orientación, fps |
| **H** | Panel oculto con sliders (sensibilidad, suavizado, luz, distancia, volumen) |
| **F** (mantener) | Simula que la sala mira el **feed** |
| **P** (mantener) | Simula que la sala mira a la **persona** (3 s seguidos = momento de gracia) |
| **B** | Activa/desactiva el modo respaldo (sin cámara) |
| **M** | Espejo **claro** (nítido, por defecto) ↔ **estilizado** (duotono desenfocado) |
| **N** | Salta a la siguiente escena de fondo, con su frase y su voz (para revisarlas rápido) |
| **E** | Salta al desenlace |
| **R** | Reinicia (vuelve a la pantalla de inicio) |
| **L** | Descarga el CSV de atención por segundo |

Los ajustes del panel H y la calibración se guardan en el navegador y sobreviven a recargar la página.

---

## 3. Checklist del día de la exposición

**Antes (en casa)**
- [ ] Prueba completa con `iniciar.command` en el **mismo computador** que usarás.
- [ ] Prueba el modo respaldo: desconecta la cámara, *Iniciar*, mantén **F** y **P**.
- [ ] (Opcional) graba `voz1.mp3`…`voz4.mp3` (ver §5).

**Montaje (15 min antes)**
- [ ] **Cámara** centrada **justo debajo o encima de la proyección**, a la altura de las cabezas si se puede, apuntando al público. Que se vea a toda la sala en la imagen (revisa con **D**).
- [ ] **Distancia**: el público entre **1 y 3 m** de la cámara. A más de 3 m, en **H → Mosaico** elige *muy lejos*.
- [ ] **Luz**: que haya luz **sobre las caras del público** (no a sus espaldas). Una lámpara o las luces del fondo del salón bastan. Evita una ventana detrás del público. Si está oscuro, sube *Realce de luz* en **H**.
- [ ] **Sonido**: parlantes conectados, volumen medio. Prueba con el botón *Iniciar* (suena un "ping").
- [ ] Pantalla completa (**F11**) y cursor fuera de la vista (la obra oculta el cursor).

**Calibrar (30 s, con el público ya sentado)**
1. Pulsa **D** para ver las caras detectadas (cajas de color).
2. Pide: *"Miren todos al centro de la pantalla"* y pulsa **C**. Espera el aviso "Calibrado ✓".
3. Pide que miren a la **persona** (lado derecho): deberían ponerse **cian**. Luego al **feed** (izquierda): **magenta**.
4. Si sale al revés → **X**. Si cuesta que cuente "persona" → **H**, baja *Umbral "mira a la persona"*.
5. Pulsa **D** para ocultar el debug, **R** para volver al inicio, y **Enter** para empezar.

**Si algo falla en vivo**
- La cámara no anda → **B** (modo respaldo) y usa **F** / **P** en un teclado. La obra sigue completa.
- Cuenta caras fantasma → **H**, sube *Confianza de detección*.
- Parpadea entre feed/persona → **H**, sube *Histéresis* o *ms sostenidos para cambiar*.

---

## 4. Cómo funciona (para la justificación)

- **Detección**: MediaPipe Face Landmarker (478 puntos por cara), hasta 8 personas, en un *Web Worker*
  para no bajar los 60 fps de la animación.
- **Caras pequeñas**: la imagen 1080p se recorre en un **mosaico multiescala** (cuadro completo + cuadros
  ampliados) para descubrir caras lejanas; luego cada cara se **sigue** con un recorte ampliado propio.
- **Orientación**: el *giro* sale de la posición de la nariz entre ambas mejillas (−1 a 1); el *cabeceo*,
  de la nariz entre frente y mentón. **Mirar hacia abajo (celular) cuenta como mirar el feed.**
- **Calibración**: ajusta una recta *giro_centro = a + b·x* para compensar que la gente sentada a los
  costados gira distinto para mirar el mismo punto.
- **Anti-parpadeo**: suavizado por cara, histéresis, tiempo mínimo para cambiar de estado y memoria de caras
  perdidas por 1,3 s.
- **Indiferencia de la sala** = proporción suavizada de gente mirando el feed (`feed / (feed + persona)`).
  Si no se detecta a nadie, tiende a 100% (si nadie la mira, el feed gana).
- **Resultado final X** = promedio, segundo a segundo, de esa proporción en toda la sesión (solo segundos
  con al menos una persona detectada). X < 50% → aparece **"Escuchado"** en vez de **"Visto"**.

**CSV (tecla L)** — una fila por segundo:
`segundo, fase, mirando_feed, mirando_persona, proporcion_feed, proporcion_feed_suavizada,
visibilidad_persona, escuchas_acumuladas, modo`, y al final líneas `#` con el resumen.
Separador coma y decimales con punto (Google Sheets lo abre directo; en Excel usa *Datos → Desde texto/CSV*).

**Escenas de fondo** (`js/escenas.js`): cada frase tiene su escena detrás de la persona (frase 1 → escena 1).
Se dibujan con canvas, sin imágenes. Cuando la sala mira el feed, la escena se pone gris, fría y desenfocada;
cuando alguien mira a la persona, recupera color y se enfoca (usa la misma "visibilidad" que apaga a la persona).
Las frases se turnan (1→2→3→4→1…), así cada escena aparece varias veces; la escena cambia, con fundido
de 1,2 s, justo cuando empieza su frase, y la persona cambia de pose (saluda, mano en la frente, muestra su
celular apagado, brazo caído).

**Sonido de la indiferencia**: un acorde grave y suave. Cuando miran a la persona es mayor, afinado y cálido;
cuando la sala la ignora baja a menor, se desafina lentamente y se apaga como detrás de un vidrio, con eco.

**El espejo** (franja inferior): la cámara en vivo, volteada como un espejo, encuadrada sobre las caras
(se acerca hasta 2×) y con brillo automático según la luz de la sala. Cada cara tiene un recuadro neón:
magenta = mira el feed, cian = mira a la persona, gris = no mira la pantalla. Abajo a la izquierda:
"2 personas detectadas · 1 mira al feed · 1 mira a la persona". Con **M** pasa al modo estilizado.

**Privacidad**: la imagen nunca sale del computador, no se guarda ni se graba; solo se muestra en vivo en
el espejo. Si prefieres que no se reconozcan las caras, pulsa **M** (modo estilizado: duotono, 128 px, desenfocado).

---

## 5. Agregar voces grabadas (voz1.mp3 … voz4.mp3)

Si no hay mp3, la persona habla con la voz del sistema en español (speechSynthesis).
Para usar una voz humana grabada (recomendado, se siente mucho más real):

1. Graba una frase por archivo, voz cercana y sin música:
   - `voz1.mp3` → "Disculpa... perdí el último tren y no conozco esta zona. ¿Me dices cómo salgo a una avenida?"
   - `voz2.mp3` → "Se me cayó la billetera en el bus... no tengo cómo volver a mi casa. ¿Me ayudas?"
   - `voz3.mp3` → "Se me apagó el celular... y ese señor me mira hace rato. ¿Me prestas tu teléfono? Una llamada."
   - `voz4.mp3` → "Me siento mareada... nadie se detiene. Sé que me están viendo. Solo quédate conmigo un ratito."
2. Cópialos a `assets/audio/` y recarga la página. En la consola aparece `voces mp3 cargadas: 4/4`.

Con mp3, la voz pasa por WebAudio: baja de volumen **y se amortigua con un filtro lowpass** cuando nadie la
mira (con speechSynthesis solo puede bajar el volumen frase a frase, porque el navegador no deja filtrarla).
Las voces se detectan leyendo el listado de la carpeta, así que funciona con `python3 -m http.server`.

---

## 6. Personalizar

Todo lo ajustable está en **`js/config.js`** (`CONFIG`): duración (120 s), fases (30 s), frases, pausas de
la voz, intensidad del feed por fase, colores, volúmenes, umbrales de detección y textos.

## 7. Estructura

```
VISTO/
├── index.html
├── iniciar.command          lanzador macOS (servidor + Chrome)
├── css/visto.css
├── js/
│   ├── config.js            CONFIG: tiempos, umbrales, colores, frases
│   ├── main.js              estado, bucle, fases, gracia, teclas, panel, CSV, desenlace
│   ├── feed.js              tarjetas, likes, toasts, glitch, partículas
│   ├── persona.js           figura SVG, respiración, desaturación, subtítulos
│   ├── audio.js             ciudad, ping, acorde de distancia, voz (mp3 + lowpass / speechSynthesis)
│   ├── vision.js            cámara, mosaico, seguimiento, orientación, calibración
│   ├── detector.worker.js   MediaPipe en un hilo aparte
│   ├── escenas.js           escenas de fondo de cada frase (canvas) + fundido
│   ├── espejo.js            franja inferior: cámara clara/estilizada + recuadros + debug
│   ├── sim.js               público simulado (modo respaldo)
│   └── final.js             desenlace y gráfico
├── assets/audio/            (voz1.mp3 … voz4.mp3 opcionales)
└── vendor/mediapipe/        tasks-vision 0.10.14 (Apache-2.0) + face_landmarker.task
```

URL de prueba: `?respaldo=1` (sin cámara), `?debug=1`, `?dur=40` (obra más corta), `?auto=1` (arranca solo).
