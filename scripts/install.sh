#!/usr/bin/env bash
# =============================================================================
# install.sh — Instalador de LaUnion para nueva instancia de cliente
# Versión: 1.0 — 2026-06-24
#
# Uso: sudo bash install.sh
# Requisitos: Ubuntu 24.04 LTS limpio, ejecutar como root
#
# Qué hace este script:
#   1. Instala paquetes del sistema (git, nginx, fail2ban, etc.)
#   2. Crea el usuario de sistema 'launion'
#   3. Instala Node.js 20 via nvm
#   4. Clona el repositorio
#   5. Crea el archivo .env con la configuración del cliente
#   6. Configura PostgreSQL local (opcional) o usa DB remota
#   7. Instala dependencias y construye la app en tmpfs
#   8. Crea el servicio systemd
#   9. Configura nginx con SSL autofirmado y fail2ban
# =============================================================================
set -euo pipefail

# ── Constantes ─────────────────────────────────────────────────────────────────
APP_USER="launion"
APP_DIR="/usr/fileserver/apps/launion-app"
REPO_URL="https://github.com/joaquines2017/LaUnion.git"
NODE_VERSION="20"

# ── Colores y helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
info()  { echo -e "  ${BLUE}→${NC} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $*"; }
step()  { echo -e "\n${BOLD}${BLUE}[$1/${TOTAL_STEPS}]${NC} ${BOLD}$2${NC}"; }
fatal() { echo -e "\n${RED}✗ Error:${NC} $*\n" >&2; exit 1; }

TOTAL_STEPS=9

# ── Banner ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║      LaUnion — Instalador  v1.0  (2026-06-24)       ║"
echo "║      Sistema de Costeo para Carpintería              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Verificaciones previas ─────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || fatal "Ejecutar como root: sudo bash install.sh"
. /etc/os-release 2>/dev/null || true
[[ "${ID:-}" == "ubuntu" ]] || warn "Se recomienda Ubuntu 24.04 LTS."
command -v curl &>/dev/null || apt-get install -y -qq curl

# ── Recolección de configuración ───────────────────────────────────────────────
echo -e "${BOLD}── Datos de la empresa ──────────────────────────────────${NC}\n"

read -rp "  Nombre de la empresa: " EMPRESA_NOMBRE
[[ -n "${EMPRESA_NOMBRE:-}" ]] || fatal "El nombre de la empresa es requerido"

SERVER_IP=$(hostname -I | awk '{print $1}')
read -rp "  IP o dominio del servidor [$SERVER_IP]: " SERVER_HOST
SERVER_HOST="${SERVER_HOST:-$SERVER_IP}"

echo ""
echo -e "${BOLD}── Usuario administrador ────────────────────────────────${NC}\n"

read -rp "  Nombre de usuario: " ADMIN_NOMBRE
[[ -n "${ADMIN_NOMBRE:-}" ]] || fatal "El nombre de usuario es requerido"

read -rp "  Email: " ADMIN_EMAIL
[[ -n "${ADMIN_EMAIL:-}" ]] || fatal "El email es requerido"

while true; do
  read -rsp "  Contraseña del admin (mín. 8 caracteres): " ADMIN_PASSWORD
  echo ""
  [[ ${#ADMIN_PASSWORD} -ge 8 ]] && break
  warn "La contraseña debe tener al menos 8 caracteres"
done

echo ""
echo -e "${BOLD}── Base de datos ────────────────────────────────────────${NC}\n"

read -rp "  Host PostgreSQL [localhost]: " DB_HOST
DB_HOST="${DB_HOST:-localhost}"

read -rp "  Puerto [5432]: " DB_PORT
DB_PORT="${DB_PORT:-5432}"

read -rp "  Nombre de la base de datos [launion_db]: " DB_NAME
DB_NAME="${DB_NAME:-launion_db}"

read -rp "  Usuario de la base de datos [launion_user]: " DB_USER
DB_USER="${DB_USER:-launion_user}"

read -rsp "  Contraseña de la base de datos (Enter = generar automáticamente): " DB_PASS_INPUT
echo ""
if [[ -z "${DB_PASS_INPUT:-}" ]]; then
  DB_PASS=$(openssl rand -hex 16)
  info "Contraseña de base de datos generada automáticamente"
else
  DB_PASS="$DB_PASS_INPUT"
fi

# Variables generadas automáticamente
SUPERADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d '=+/' | cut -c1-16)
AUTH_SECRET=$(openssl rand -base64 32)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# ── Confirmación ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── Resumen de instalación ───────────────────────────────${NC}\n"
echo "  Empresa:    $EMPRESA_NOMBRE"
echo "  Servidor:   https://$SERVER_HOST"
echo "  Admin:      $ADMIN_EMAIL ($ADMIN_NOMBRE)"
echo "  Base datos: $DB_HOST:$DB_PORT/$DB_NAME (usuario: $DB_USER)"
echo ""
read -rp "  ¿Confirmar instalación? [s/N]: " CONFIRM
[[ "${CONFIRM:-}" =~ ^[sS]$ ]] || { echo "Instalación cancelada."; exit 0; }
echo ""

# ── PASO 1: Paquetes del sistema ───────────────────────────────────────────────
step 1 "Instalando paquetes del sistema"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  git curl rsync nginx openssl fail2ban
ok "Paquetes instalados"

# ── PASO 2: Usuario y directorios ─────────────────────────────────────────────
step 2 "Configurando usuario $APP_USER y directorios"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  ok "Usuario $APP_USER creado"
else
  info "Usuario $APP_USER ya existe"
fi
echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/"$APP_USER"
chmod 440 /etc/sudoers.d/"$APP_USER"

mkdir -p "$APP_DIR/storage/uploads"
chown -R "$APP_USER:$APP_USER" /usr/fileserver
ok "Directorios listos: $APP_DIR"

# ── PASO 3: Node.js via nvm ───────────────────────────────────────────────────
step 3 "Instalando Node.js $NODE_VERSION via nvm"
su - "$APP_USER" -c "
  if [ -d \"\$HOME/.nvm\" ]; then
    echo '  nvm ya instalado'
  else
    curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  export NVM_DIR=\"\$HOME/.nvm\" && source \"\$NVM_DIR/nvm.sh\"
  nvm install $NODE_VERSION --silent
  nvm alias default $NODE_VERSION
  echo \"  Node: \$(node -v)  npm: \$(npm -v)\"
"
ok "Node.js instalado"

# ── PASO 4: Clonar repositorio ────────────────────────────────────────────────
step 4 "Clonando repositorio"
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo ya existe, actualizando..."
  su - "$APP_USER" -c "cd '$APP_DIR' && git pull origin main"
else
  su - "$APP_USER" -c "git clone '$REPO_URL' '$APP_DIR'"
fi
ok "Código descargado en $APP_DIR"

# ── PASO 5: Crear .env ────────────────────────────────────────────────────────
step 5 "Creando archivo .env"
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="${DATABASE_URL}"
AUTH_SECRET="${AUTH_SECRET}"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="https://${SERVER_HOST}"
UPLOADS_BASE_PATH="${APP_DIR}/storage/uploads"
NODE_ENV=production
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
ok ".env creado"

# ── PASO 6: PostgreSQL local (si DB_HOST es localhost) ────────────────────────
step 6 "Configurando base de datos"
if [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]]; then
  info "Instalando PostgreSQL local..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql
  systemctl enable postgresql
  systemctl start postgresql
  # Crear usuario DB si no existe
  sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename='${DB_USER}'" \
    | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
  # Crear base de datos si no existe
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
    | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  ok "PostgreSQL local listo: $DB_NAME (usuario: $DB_USER)"
else
  info "Usando DB remota: $DB_HOST:$DB_PORT/$DB_NAME"
  warn "Asegurate de que el usuario '$DB_USER' y la base '$DB_NAME' existan en $DB_HOST"
fi

# ── PASO 7: Build en tmpfs ────────────────────────────────────────────────────
step 7 "Instalando dependencias y construyendo la aplicación"

BUILD_DIR="/run/launion-install-$$"
NPM_CACHE="/run/npm-cache-launion-install"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$NPM_CACHE"
chown "$APP_USER:$APP_USER" "$BUILD_DIR" "$NPM_CACHE"

info "Copiando fuentes a tmpfs..."
su - "$APP_USER" -c "
  rsync -a \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=storage \
    '${APP_DIR}/' '${BUILD_DIR}/'
"

info "Instalando dependencias (npm ci)..."
su - "$APP_USER" -c "
  export NVM_DIR=\"\$HOME/.nvm\" && source \"\$NVM_DIR/nvm.sh\"
  cd '${BUILD_DIR}'
  npm ci --legacy-peer-deps --cache '${NPM_CACHE}' --silent
"
ok "Dependencias instaladas"

info "Generando cliente Prisma y aplicando migraciones..."
su - "$APP_USER" -c "
  export NVM_DIR=\"\$HOME/.nvm\" && source \"\$NVM_DIR/nvm.sh\"
  cd '${BUILD_DIR}'
  ./node_modules/.bin/prisma generate
  ./node_modules/.bin/prisma migrate deploy
"
ok "Migraciones aplicadas"

info "Cargando datos iniciales..."
# Usamos un script temporal para pasar las variables con seguridad
SEED_RUNNER=$(mktemp /tmp/launion-seed-XXXX.sh)
cat > "$SEED_RUNNER" <<SEEDRUNNER
#!/usr/bin/env bash
export NVM_DIR="\$HOME/.nvm" && source "\$NVM_DIR/nvm.sh"
export INSTALL_EMPRESA_NOMBRE="${EMPRESA_NOMBRE}"
export INSTALL_EMPRESA_DOMINIO="${SERVER_HOST}"
export INSTALL_ADMIN_NOMBRE="${ADMIN_NOMBRE}"
export INSTALL_ADMIN_EMAIL="${ADMIN_EMAIL}"
export INSTALL_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
export INSTALL_SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD}"
cd "${BUILD_DIR}"
node scripts/seed-install.mjs
SEEDRUNNER
chmod +x "$SEED_RUNNER"
chown "$APP_USER:$APP_USER" "$SEED_RUNNER"
su - "$APP_USER" -c "bash '$SEED_RUNNER'"
rm -f "$SEED_RUNNER"
ok "Datos iniciales cargados"

info "Construyendo aplicación Next.js..."
su - "$APP_USER" -c "
  export NVM_DIR=\"\$HOME/.nvm\" && source \"\$NVM_DIR/nvm.sh\"
  cd '${BUILD_DIR}'
  npm run build
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public
  mkdir -p .next/standalone/public/uploads
"
ok "Build completado"

info "Instalando en disco..."
su - "$APP_USER" -c "rm -rf '${APP_DIR}/.next'"
su - "$APP_USER" -c "cp -r '${BUILD_DIR}/.next' '${APP_DIR}/.next'"
rm -rf "$BUILD_DIR"
ok "Aplicación instalada"

# ── PASO 8: Servicio systemd ───────────────────────────────────────────────────
step 8 "Configurando servicio systemd"
NODE_PATH=$(su - "$APP_USER" -c \
  'export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && which node')
info "Usando node: $NODE_PATH"

cat > /etc/systemd/system/launion.service <<EOF
[Unit]
Description=LaUnion — Sistema de Costeo para Carpintería
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/.next/standalone
ExecStart=${NODE_PATH} server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=${APP_DIR}/.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=launion
LimitNOFILE=65536
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable launion
systemctl start launion
sleep 3

if systemctl is-active --quiet launion; then
  ok "Servicio launion activo"
else
  echo ""
  systemctl status launion --no-pager -l
  fatal "El servicio no inició. Revisá los logs: journalctl -u launion -n 50"
fi

# ── PASO 9: nginx + SSL + fail2ban ────────────────────────────────────────────
step 9 "Configurando nginx, SSL y fail2ban"
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/launion.key \
  -out /etc/nginx/ssl/launion.crt \
  -subj "/CN=${SERVER_HOST}" \
  -addext "subjectAltName=IP:${SERVER_HOST},DNS:${SERVER_HOST}" \
  2>/dev/null

cat > /etc/nginx/sites-available/launion <<'NGINXEOF'
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate     /etc/nginx/ssl/launion.crt;
    ssl_certificate_key /etc/nginx/ssl/launion.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/launion /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx
ok "nginx configurado"

cat > /etc/fail2ban/jail.local <<'F2BEOF'
[sshd]
enabled  = true
port     = 22
maxretry = 5
findtime = 10m
bantime  = 1h
ignoreip = 127.0.0.1/8 ::1
F2BEOF
systemctl enable fail2ban && systemctl restart fail2ban
ok "fail2ban configurado"

# ── Verificación final ────────────────────────────────────────────────────────
HEALTH=$(curl -sk "https://localhost/api/health" 2>/dev/null || echo "sin respuesta")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  HEALTH_STATUS="${GREEN}✓ OK${NC}"
else
  HEALTH_STATUS="${YELLOW}⚠ verificar manualmente${NC} ($HEALTH)"
fi

# ── Resumen final ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               ✓  Instalación completada                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Empresa     : %-47s║\n" "$EMPRESA_NOMBRE"
printf "║  URL         : %-47s║\n" "https://$SERVER_HOST"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ACCESO ADMINISTRADOR                                        ║"
printf "║  Email       : %-47s║\n" "$ADMIN_EMAIL"
printf "║  Contraseña  : %-47s║\n" "$ADMIN_PASSWORD"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  SUPERADMIN (uso interno — no compartir con el cliente)      ║"
printf "║  Email       : %-47s║\n" "superadmin@sistema.local"
printf "║  Contraseña  : %-47s║\n" "$SUPERADMIN_PASSWORD"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ► Guardá estas credenciales en un lugar seguro              ║"
echo "║  ► El navegador mostrará advertencia SSL (cert autofirmado)  ║"
echo "║  ► Aceptar la excepción una sola vez para continuar          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  Comandos útiles:"
echo "    journalctl -u launion -f                # logs en tiempo real"
echo "    systemctl status launion                # estado del servicio"
echo "    bash $APP_DIR/scripts/deploy.sh         # actualizar a nueva versión"
echo ""
echo -e "  Health check: $(echo -e $HEALTH_STATUS)"
echo ""
