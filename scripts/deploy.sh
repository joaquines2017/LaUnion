#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Actualizar LaUnion a la última versión del repo
# Uso: cd /opt/launion-app && bash scripts/deploy.sh
# Correr como root o como el usuario 'launion' con sudo para systemctl
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="launion"
# Directorio de build en tmpfs: evita I/O pesado sobre el disco de la app,
# que ha mostrado sectores defectuosos (EROFS recurrente). /run es tmpfs y
# se limpia en cada reboot, por lo que la operación es siempre sobre RAM.
BUILD_DIR="/run/launion-build"
NPM_CACHE_DIR="/run/npm-cache-${APP_USER}"

# Detectar node/npm desde nvm del usuario de la app (no disponible en PATH de root)
NVM_INIT='export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
RUN_AS="sudo -u $APP_USER bash -c"

echo "=== LaUnion — Deploy ==="
echo "  Directorio: $APP_DIR"
echo "  Build:      $BUILD_DIR (tmpfs)"
echo "  Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd "$APP_DIR"

# ── 1. Obtener últimos cambios ─────────────────────────────────────────────────
echo "[1/5] Actualizando código..."
sudo -u "$APP_USER" git checkout -- package.json package-lock.json
sudo -u "$APP_USER" git pull origin main

# ── 2. Copiar fuentes + instalar dependencias en tmpfs ────────────────────────
echo "[2/5] Instalando dependencias (tmpfs)..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$NPM_CACHE_DIR"
chown "${APP_USER}:${APP_USER}" "$BUILD_DIR" "$NPM_CACHE_DIR"

# Copiar fuentes al tmpfs (leer desde disco, escribir en RAM — seguro)
sudo -u "$APP_USER" rsync -a --exclude=node_modules --exclude=.next --exclude=storage \
  "$APP_DIR/" "$BUILD_DIR/"

$RUN_AS "$NVM_INIT && cd '$BUILD_DIR' && npm ci --cache '$NPM_CACHE_DIR' --legacy-peer-deps"

# ── 3. Regenerar cliente Prisma y aplicar migraciones ─────────────────────────
echo "[3/5] Aplicando migraciones de base de datos..."
$RUN_AS "$NVM_INIT && cd '$BUILD_DIR' && ./node_modules/.bin/prisma generate"
$RUN_AS "$NVM_INIT && cd '$BUILD_DIR' && ./node_modules/.bin/prisma migrate deploy"

# ── 4. Build de producción en tmpfs ──────────────────────────────────────────
echo "[4/5] Construyendo la aplicación..."
$RUN_AS "$NVM_INIT && cd '$BUILD_DIR' && npm run build"

# Copiar estáticos dentro del standalone (todo en tmpfs, sin tocar disco aún)
sudo -u "$APP_USER" rm -rf "$BUILD_DIR/.next/standalone/.next/static" \
                            "$BUILD_DIR/.next/standalone/public"
sudo -u "$APP_USER" cp -r "$BUILD_DIR/.next/static"  "$BUILD_DIR/.next/standalone/.next/static"
sudo -u "$APP_USER" cp -r "$BUILD_DIR/public"         "$BUILD_DIR/.next/standalone/public"

# Preservar uploads subidos por usuarios antes de reemplazar .next en disco
UPLOADS_SAVE="${APP_DIR}/.uploads_save_$$"
UPLOADS_SRC="${APP_DIR}/.next/standalone/public/uploads"
if [ -d "$UPLOADS_SRC" ]; then
  sudo -u "$APP_USER" mv "$UPLOADS_SRC" "$UPLOADS_SAVE"
fi

# Reemplazar .next en disco con el resultado del build (mínimo I/O al disco)
sudo -u "$APP_USER" rm -rf "$APP_DIR/.next"
sudo -u "$APP_USER" cp -r  "$BUILD_DIR/.next" "$APP_DIR/.next"

# Restaurar uploads
if [ -d "$UPLOADS_SAVE" ]; then
  sudo -u "$APP_USER" mv "$UPLOADS_SAVE" "$UPLOADS_SRC"
fi

# Limpiar build de tmpfs
rm -rf "$BUILD_DIR"

# ── 5. Reiniciar servicio ─────────────────────────────────────────────────────
echo "[5/5] Reiniciando servicio..."
systemctl restart launion
sleep 2

if systemctl is-active --quiet launion; then
  echo ""
  echo "✓ Deploy completado — servicio activo"
else
  echo ""
  echo "✗ Error al reiniciar el servicio"
  echo "  Ver logs: journalctl -u launion -n 50"
  exit 1
fi
