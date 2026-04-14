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
sudo -u "$APP_USER" git pull origin main

# ── 2. Instalar/actualizar dependencias ───────────────────────────────────────
echo "[2/5] Instalando dependencias..."
sudo -u "$APP_USER" npm ci --omit=dev

# ── 3. Regenerar cliente Prisma y aplicar migraciones ─────────────────────────
echo "[3/5] Aplicando migraciones de base de datos..."
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma migrate deploy

# ── 4. Build de producción ────────────────────────────────────────────────────
echo "[4/5] Construyendo la aplicación..."
sudo -u "$APP_USER" npm run build

# Copiar archivos estáticos al directorio standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

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
