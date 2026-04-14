#!/usr/bin/env bash
# =============================================================================
# setup-db.sh — Configuración inicial del contenedor LXC de base de datos
# Uso: bash setup-db.sh --db-password "PASSWORD" --app-ip "192.168.1.11"
# Correr como root en un LXC Ubuntu 22.04 limpio
# =============================================================================
set -euo pipefail

# ── Argumentos ────────────────────────────────────────────────────────────────
DB_PASSWORD=""
APP_IP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-password) DB_PASSWORD="$2"; shift 2 ;;
    --app-ip)      APP_IP="$2";      shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

if [[ -z "$DB_PASSWORD" || -z "$APP_IP" ]]; then
  echo "Uso: $0 --db-password PASSWORD --app-ip IP_APP"
  exit 1
fi

DB_NAME="launion"
DB_USER="launion_user"

echo "=== LaUnion — Configuración de base de datos ==="
echo "  Usuario DB : $DB_USER"
echo "  Base datos : $DB_NAME"
echo "  IP app     : $APP_IP"
echo ""

# ── 1. Actualizar sistema e instalar PostgreSQL 16 ────────────────────────────
echo "[1/5] Instalando PostgreSQL 16..."
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

# ── 2. Crear usuario y base de datos ─────────────────────────────────────────
echo "[2/5] Creando usuario y base de datos..."
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')
\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

# ── 3. Configurar pg_hba.conf para aceptar conexiones remotas de la app ───────
echo "[3/5] Configurando acceso remoto desde $APP_IP..."
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

# Agregar regla si no existe
if ! grep -q "$APP_IP" "$PG_HBA"; then
  echo "host    $DB_NAME    $DB_USER    $APP_IP/32    scram-sha-256" >> "$PG_HBA"
fi

# ── 4. Configurar postgresql.conf para escuchar en todas las interfaces ───────
echo "[4/5] Configurando listen_addresses..."
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
# Si ya estaba sin comentar, asegurarse de que esté bien
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

# ── 5. Habilitar y reiniciar PostgreSQL ───────────────────────────────────────
echo "[5/5] Habilitando servicio PostgreSQL..."
systemctl enable postgresql
systemctl restart postgresql

# ── Verificación ─────────────────────────────────────────────────────────────
echo ""
echo "=== Verificando conexión ==="
sudo -u postgres psql -c "\l" | grep "$DB_NAME" && echo "✓ Base de datos '$DB_NAME' creada correctamente"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Base de datos configurada exitosamente              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Host     : $(hostname -I | awk '{print $1}')                           ║"
echo "║  Puerto   : 5432                                     ║"
echo "║  Base     : $DB_NAME                                   ║"
echo "║  Usuario  : $DB_USER                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "DATABASE_URL para el .env del contenedor app:"
echo "  postgresql://$DB_USER:$DB_PASSWORD@$(hostname -I | awk '{print $1}'):5432/$DB_NAME"
