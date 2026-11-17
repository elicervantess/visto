#!/bin/bash
# Doble clic para iniciar VISTO (macOS). Abre un servidor local y Chrome en pantalla completa.
cd "$(dirname "$0")"
PUERTO=8000
python3 -m http.server $PUERTO >/dev/null 2>&1 &
SERVIDOR=$!
sleep 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  "$CHROME" --user-data-dir="$HOME/.visto-chrome" --autoplay-policy=no-user-gesture-required \
    --start-fullscreen --no-first-run "http://localhost:$PUERTO/" >/dev/null 2>&1
else
  open "http://localhost:$PUERTO/"
  echo "Abre Chrome en http://localhost:$PUERTO/ — cierra esta ventana para apagar el servidor."
  wait $SERVIDOR
fi
kill $SERVIDOR 2>/dev/null
