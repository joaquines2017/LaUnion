#!/usr/bin/env bash
# =============================================================================
# agregar-empresa-proxy.sh — Agregar un nuevo dominio/empresa al nginx-proxy
#
# Uso:
#   bash agregar-empresa-proxy.sh \
#     --dominio "donjose.ddns.net" \
#     --app-ip  "192.168.1.11"
#
# Correr como root en el LXC nginx-proxy.
# El dominio debe apuntar a la IP pública antes de ejecutar este script.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
die()  { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Parámetros ─────────────────────────────────────────────────────────────────
DOMINIO=""
APP_IP=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dominio) DOMINIO="$2"; shift 2 ;;
    --app-ip)  APP_IP="$2";  shift 2 ;;
    *) die "Parámetro desconocido: $1" ;;
  esac
done

[[ -z "$DOMINIO" ]] && die "Falta --dominio (ej: --dominio donjose.ddns.net)"
[[ -z "$APP_IP" ]]  && die "Falta --app-ip  (ej: --app-ip 192.168.1.11)"

# Verificar que no exista ya
[[ -f "/etc/nginx/sites-available/${DOMINIO}" ]] && \
  die "Ya existe una configuración para $DOMINIO"

echo ""
echo "=== Agregar empresa: $DOMINIO ==="
echo ""
warn "Antes de continuar verificá que:"
echo "  1. El hostname '$DOMINIO' en No-IP apunta a tu IP pública"
echo "  2. El port forwarding 80/443 en el router apunta a este servidor"
echo ""
read -r -p "¿Está todo configurado? (s/n): " CONFIRM
[[ "$CONFIRM" =~ ^[Ss]$ ]] || { warn "Abortado."; exit 0; }

# ── 1. Crear virtual host Nginx ────────────────────────────────────────────────
echo "[1/3] Creando virtual host Nginx..."
cat > "/etc/nginx/sites-available/${DOMINIO}" <<VHOST
server {
    listen 80;
    server_name ${DOMINIO};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMINIO};

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    limit_req zone=launion_global burst=50 nodelay;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location / {
        proxy_pass         http://${APP_IP}:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
VHOST

ln -sf "/etc/nginx/sites-available/${DOMINIO}" "/etc/nginx/sites-enabled/${DOMINIO}"
nginx -t
systemctl reload nginx
ok "Virtual host creado para $DOMINIO"

# ── 2. Certificado SSL ─────────────────────────────────────────────────────────
echo "[2/3] Obteniendo certificado SSL..."
certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos \
  --email "admin@${DOMINIO}" --redirect
ok "SSL activo para $DOMINIO"

# ── 3. Verificación ────────────────────────────────────────────────────────────
echo "[3/3] Verificando..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMINIO}" --max-time 10 || echo "000")
if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
  ok "https://$DOMINIO responde correctamente (HTTP $HTTP_CODE)"
else
  warn "https://$DOMINIO respondió con código $HTTP_CODE — verificar manualmente"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
printf "║  ✓ Empresa agregada: %-41s║\n" "https://$DOMINIO"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Próximos pasos en launion-app:                              ║"
echo "║    1. Agregar DATABASE_URL_EMPRESA al .env                   ║"
echo "║    2. bash scripts/crear-empresa.sh --slug ...               ║"
echo "║    3. systemctl restart launion                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
