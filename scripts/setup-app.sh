#!/usr/bin/env bash
# =============================================================================
# setup-app.sh — Configuración inicial del contenedor LXC de la aplicación
# Uso: bash setup-app.sh --repo-url URL --db-url URL --auth-secret SECRET --app-url URL
# Correr como root en un LXC Ubuntu 22.04 limpio
# =============================================================================
set -euo pipefail

# ── Argumentos ────────────────────────────────────────────────────────────────
REPO_URL=""
DB_URL=""
AUTH_SECRET=""
APP_URL=""
APP_DIR="/opt/launion-app"
APP_USER="launion"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url)    REPO_URL="$2";    shift 2 ;;
    --db-url)      DB_URL="$2";      shift 2 ;;
    --auth-secret) AUTH_SECRET="$2"; shift 2 ;;
    --app-url)     APP_URL="$2";     shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

if [[ -z "$REPO_URL" || -z "$DB_URL" || -z "$AUTH_SECRET" || -z "$APP_URL" ]]; then
  echo "Uso: $0 --repo-url URL --db-url URL --auth-secret SECRET --app-url URL"
  exit 1
fi

echo "=== LaUnion — Configuración del servidor de aplicación ==="
echo "  Repo    : $REPO_URL"
echo "  App URL : $APP_URL"
echo "  Destino : $APP_DIR"
echo ""

# ── 1. Actualizar sistema e instalar dependencias base ────────────────────────
echo "[1/7] Actualizando sistema..."
apt-get update -qq
apt-get install -y -qq curl git ca-certificates openssl

# ── 2. Instalar Node.js 20 ────────────────────────────────────────────────────
echo "[2/7] Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  Node.js: $(node -v) | npm: $(npm -v)"

# ── 3. Crear usuario de sistema y directorio ──────────────────────────────────
echo "[3/7] Creando usuario '$APP_USER'..."
if ! id "$APP_USER" &>/dev/null; then
  useradd --system --shell /bin/bash --home "$APP_DIR" --create-home "$APP_USER"
fi

# ── 4. Clonar repositorio ─────────────────────────────────────────────────────
echo "[4/7] Clonando repositorio..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "  Repo ya existe, actualizando..."
  cd "$APP_DIR"
  sudo -u "$APP_USER" git pull origin main
else
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Crear archivo .env ─────────────────────────────────────────────────────
echo "[5/7] Configurando variables de entorno..."
cat > "$APP_DIR/.env" <<ENV
DATABASE_URL="$DB_URL"
AUTH_SECRET="$AUTH_SECRET"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="$APP_URL"
NODE_ENV=production
ENV
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# ── 6. Instalar dependencias, generar cliente Prisma y build ──────────────────
echo "[6/7] Instalando dependencias y construyendo la app..."
cd "$APP_DIR"

# Limpiar build anterior y asegurar que APP_USER sea dueño de todo
rm -rf "$APP_DIR/.next"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

sudo -u "$APP_USER" npm ci

sudo -u "$APP_USER" npx prisma generate

sudo -u "$APP_USER" npm run build

# Copiar archivos estáticos al directorio standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

# Aplicar migraciones (deploy no pide confirmación)
sudo -u "$APP_USER" npx prisma migrate deploy

# Cargar datos iniciales
sudo -u "$APP_USER" npm run db:seed || echo "  (seed ya aplicado o no es necesario)"

# ── 7. Instalar servicio systemd ──────────────────────────────────────────────
echo "[7/7] Configurando servicio systemd..."
cp "$APP_DIR/scripts/service/launion.service" /etc/systemd/system/launion.service
systemctl daemon-reload
systemctl enable launion
systemctl start launion

# ── Verificación ─────────────────────────────────────────────────────────────
sleep 3
if systemctl is-active --quiet launion; then
  STATUS="✓ ACTIVO"
else
  STATUS="✗ ERROR — revisar: journalctl -u launion -n 50"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Aplicación instalada                                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Directorio : $APP_DIR               ║"
echo "║  Servicio   : launion.service                        ║"
echo "║  Estado     : $STATUS                       ║"
echo "║  URL        : $APP_URL           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Comandos útiles:"
echo "  systemctl status launion      # ver estado"
echo "  journalctl -u launion -f      # ver logs en tiempo real"
echo "  cd $APP_DIR && bash scripts/deploy.sh  # actualizar"
