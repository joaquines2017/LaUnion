#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Actualizar LaUnion a la última versión del repo
# Uso: cd /opt/launion-app && bash scripts/deploy.sh
# Correr como root o como el usuario 'launion' con sudo para systemctl
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="launion"

echo "=== LaUnion — Deploy ==="
echo "  Directorio: $APP_DIR"
echo "  Fecha:      $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd "$APP_DIR"

# ── 1. Obtener últimos cambios ─────────────────────────────────────────────────
echo "[1/5] Actualizando código..."
sudo -u "$APP_USER" git checkout -- package.json package-lock.json
sudo -u "$APP_USER" git pull origin main

# ── 2. Instalar/actualizar dependencias ───────────────────────────────────────
echo "[2/5] Instalando dependencias..."
# Limpieza explícita antes de npm ci: evita que binarios corruptos de EROFS
# anteriores bloqueen la instalación.
sudo -u "$APP_USER" rm -rf node_modules
sudo -u "$APP_USER" npm ci --legacy-peer-deps

# ── 3. Regenerar cliente Prisma y aplicar migraciones ─────────────────────────
echo "[3/5] Aplicando migraciones de base de datos..."
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma migrate deploy

# ── 4. Build de producción ────────────────────────────────────────────────────
echo "[4/5] Construyendo la aplicación..."
sudo -u "$APP_USER" npm run build

# Copiar archivos estáticos al directorio standalone.
# Se preservan las imágenes subidas por usuarios (public/uploads) moviéndolas
# antes de borrar y restaurándolas después: mv es un rename dentro del mismo
# filesystem, por lo que es instantáneo y no desencadena I/O pesado.
UPLOADS_SAVE="${APP_DIR}/.uploads_save_$$"
UPLOADS_SRC="${APP_DIR}/.next/standalone/public/uploads"
if [ -d "$UPLOADS_SRC" ]; then
  sudo -u "$APP_USER" mv "$UPLOADS_SRC" "$UPLOADS_SAVE"
fi

sudo -u "$APP_USER" rm -rf .next/standalone/.next/static .next/standalone/public
sudo -u "$APP_USER" cp -r .next/static .next/standalone/.next/static
sudo -u "$APP_USER" cp -r public .next/standalone/public

if [ -d "$UPLOADS_SAVE" ]; then
  sudo -u "$APP_USER" mv "$UPLOADS_SAVE" "${APP_DIR}/.next/standalone/public/uploads"
fi

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
