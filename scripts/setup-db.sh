#!/usr/bin/env bash
# =============================================================================
# setup-db.sh — Configuración del contenedor LXC de base de datos
#
# Uso (primera vez o para recrear desde cero):
#   bash setup-db.sh --db-password "PASSWORD" --app-ip "192.168.x.x"
#
# Uso (recrear DB + importar dump):
#   bash setup-db.sh --db-password "PASSWORD" --app-ip "192.168.x.x" \
#                    --dump-file /tmp/launion_datos.sql
#
# Correr como root (o usuario con sudo) en el LXC Ubuntu 22.04
# =============================================================================
set -euo pipefail

# ── Argumentos ────────────────────────────────────────────────────────────────
DB_PASSWORD=""
APP_IP=""
DUMP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-password) DB_PASSWORD="$2"; shift 2 ;;
    --app-ip)      APP_IP="$2";      shift 2 ;;
    --dump-file)   DUMP_FILE="$2";   shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

if [[ -z "$DB_PASSWORD" || -z "$APP_IP" ]]; then
  echo "Uso: $0 --db-password PASSWORD --app-ip IP_APP [--dump-file /ruta/dump.sql]"
  exit 1
fi

DB_NAME="launion"
DB_USER="launion_user"

echo "=== LaUnion — Configuración de base de datos ==="
echo "  Usuario DB : $DB_USER"
echo "  Base datos : $DB_NAME"
echo "  IP app     : $APP_IP"
[[ -n "$DUMP_FILE" ]] && echo "  Dump       : $DUMP_FILE"
echo ""

# ── 1. Instalar PostgreSQL 16 si no está ─────────────────────────────────────
echo "[1/6] Verificando PostgreSQL 16..."
if ! command -v psql &>/dev/null || ! psql --version | grep -q "16\."; then
  echo "  Instalando PostgreSQL 16..."
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates gnupg lsb-release

  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg

  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list

  apt-get update -qq
  apt-get install -y -qq postgresql-16
else
  echo "  PostgreSQL ya instalado: $(psql --version)"
fi

systemctl start postgresql || true

# ── 2. Recrear usuario y base de datos con encoding UTF-8 ────────────────────
echo "[2/6] Recreando base de datos con encoding UTF-8..."
sudo -u postgres psql <<SQL
-- Crear/actualizar usuario
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

-- Terminar conexiones activas a la base (para poder dropearla)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();

-- Dropear y recrear con encoding UTF8 (locale C.UTF-8 funciona en cualquier sistema)
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME
  OWNER $DB_USER
  ENCODING 'UTF8'
  LC_COLLATE 'C.UTF-8'
  LC_CTYPE 'C.UTF-8'
  TEMPLATE template0;

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

echo "  ✓ Base de datos '$DB_NAME' creada con encoding UTF-8"

# ── 3. Configurar acceso remoto ───────────────────────────────────────────────
echo "[3/6] Configurando acceso remoto desde $APP_IP..."
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"

# listen_addresses = '*'
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

# Regla de acceso para la IP de la app
if ! grep -q "host.*$DB_NAME.*$DB_USER.*$APP_IP" "$PG_HBA"; then
  echo "host    $DB_NAME    $DB_USER    $APP_IP/32    scram-sha-256" >> "$PG_HBA"
fi

# Acceso local para poder importar el dump
if ! grep -q "^local.*$DB_NAME.*$DB_USER" "$PG_HBA"; then
  # Insertar antes de la primera línea "local all all" existente
  sed -i "/^local   all             all/i local   $DB_NAME    $DB_USER    md5" "$PG_HBA"
fi

systemctl reload postgresql
echo "  ✓ Acceso configurado"

# ── 4. Importar dump si se proporcionó ───────────────────────────────────────
if [[ -n "$DUMP_FILE" ]]; then
  if [[ ! -f "$DUMP_FILE" ]]; then
    echo "ERROR: No se encontró el archivo dump: $DUMP_FILE"
    exit 1
  fi

  echo "[4/6] Importando datos desde $DUMP_FILE..."
  # session_replication_role=replica deshabilita FK checks durante import
  sudo -u postgres psql \
    --set ON_ERROR_STOP=off \
    --set session_replication_role=replica \
    -d "$DB_NAME" \
    -f "$DUMP_FILE"
  echo "  ✓ Datos importados"
else
  echo "[4/6] Sin dump — la app aplicará migraciones y seed al iniciar"
fi

# ── 5. Habilitar servicio ─────────────────────────────────────────────────────
echo "[5/6] Habilitando servicio PostgreSQL..."
systemctl enable postgresql
systemctl restart postgresql
echo "  ✓ PostgreSQL activo"

# ── 6. Verificación ───────────────────────────────────────────────────────────
echo "[6/6] Verificando..."
DB_IP=$(hostname -I | awk '{print $1}')
TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
echo "  Tablas en la base: $TABLE_COUNT"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Base de datos lista                                         ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Host     : %-48s ║\n" "$DB_IP"
echo "║  Puerto   : 5432                                             ║"
printf "║  Base     : %-48s ║\n" "$DB_NAME"
printf "║  Usuario  : %-48s ║\n" "$DB_USER"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "DATABASE_URL para el .env del contenedor app:"
echo "  postgresql://$DB_USER:$DB_PASSWORD@$DB_IP:5432/$DB_NAME"
