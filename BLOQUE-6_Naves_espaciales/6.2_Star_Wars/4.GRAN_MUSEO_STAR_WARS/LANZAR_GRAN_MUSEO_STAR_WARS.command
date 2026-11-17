#!/bin/bash
ROOT_DIR="/Users/externo/Library/Mobile Documents/com~apple~CloudDocs/PERSONAL/CLASES DE TECNOLOGÍA/CURSO-ROBOTICA-V2"
cd "$ROOT_DIR"

# 1. Iniciar servidor local en puerto 8888 si no está activo
if ! lsof -i :8888 >/dev/null 2>&1; then
  echo "Iniciando servidor local en el puerto 8888..."
  python3 -m http.server 8888 >/dev/null 2>&1 &
  sleep 1
fi

echo "Abriendo el Gran Museo de Star Wars en el navegador..."

# 2. Abrir en Chrome o navegador predeterminado
osascript -e '
tell application "Google Chrome"
    activate
    open location "http://localhost:8888/BLOQUE-6_Naves_espaciales/6.2_Star_Wars/4.GRAN_MUSEO_STAR_WARS/index.html"
end tell
' 2>/dev/null || open "http://localhost:8888/BLOQUE-6_Naves_espaciales/6.2_Star_Wars/4.GRAN_MUSEO_STAR_WARS/index.html"
