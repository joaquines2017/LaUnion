#!/usr/bin/env bash
# =============================================================================
# setup-proxy.sh — Configurar contenedor LXC nginx-proxy
#
# Uso:
#   bash setup-proxy.sh \
#     --dominio "launion.ddns.net" \
#     --app-ip  "192.168.1.11" \
#     --noip-user "tu_usuario_noip" \
#     --noip-pass "tu_password_noip"
#
# Correr como root en el LXC nginx-proxy (Ubuntu 22.04).
# El contenedor debe tener salida a internet y los puertos 80/443
# redirigidos desde el router hacia su IP.
# =============================================================================
set -euo pipefail

# ── Colores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
die()  { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Parámetros ─────────────────────────────────────────────────────────────────
DOMINIO=""
APP_IP=""
NOIP_USER=""
NOIP_PASS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dominio)   DOMINIO="$2";   shift 2 ;;
    --app-ip)    APP_IP="$2";    shift 2 ;;
    --noip-user) NOIP_USER="$2"; shift 2 ;;
    --noip-pass) NOIP_PASS="$2"; shift 2 ;;
    *) die "Parámetro desconocido: $1" ;;
  esac
done

[[ -z "$DOMINIO" ]]   && die "Falta --dominio"
[[ -z "$APP_IP" ]]    && die "Falta --app-ip"
[[ -z "$NOIP_USER" ]] && die "Falta --noip-user"
[[ -z "$NOIP_PASS" ]] && die "Falta --noip-pass"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        LaUnion — Setup nginx-proxy                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  Dominio:  $DOMINIO"
echo "  App IP:   $APP_IP"
echo ""

# ── 1. Paquetes ────────────────────────────────────────────────────────────────
echo "[1/6] Instalando paquetes..."
apt update -qq
apt install -y nginx certbot python3-certbot-nginx fail2ban ufw curl build-essential
ok "Paquetes instalados"

# ── 2. noip2 — cliente DDNS ────────────────────────────────────────────────────
echo "[2/6] Configurando cliente No-IP (noip2)..."
TMP=$(mktemp -d)
curl -fsSL "https://www.noip.com/client/linux/noip-duc-linux.tar.gz" -o "$TMP/noip.tar.gz"
tar xzf "$TMP/noip.tar.gz" -C "$TMP"
cd "$TMP"/noip-duc-linux-*/
make -s && make install

# Crear configuración no interactiva
mkdir -p /usr/local/etc
cat > /tmp/noip_config_input.txt <<EOF
$NOIP_USER
$NOIP_PASS
1
30
n
EOF
/usr/local/bin/noip2 -C -Y < /tmp/noip_config_input.txt 2>/dev/null || true
rm -f /tmp/noip_config_input.txt
cd /

# Servicio systemd para noip2
cat > /etc/systemd/system/noip2.service <<'UNIT'
[Unit]
Description=No-IP Dynamic DNS Update Client
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/noip2
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable noip2
systemctl start noip2
ok "noip2 activo"

# ── 3. UFW — Firewall ──────────────────────────────────────────────────────────
echo "[3/6] Configurando firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "UFW activo — puertos abiertos: 22, 80, 443"

# ── 4. Nginx — Virtual host con rate limiting y headers de seguridad ───────────
echo "[4/6] Configurando Nginx..."

# Zona de rate limiting global
cat > /etc/nginx/conf.d/rate-limit.conf <<'CONF'
limit_req_zone $binary_remote_addr zone=launion_global:10m rate=20r/s;
CONF

# Virtual host para el primer dominio
cat > "/etc/nginx/sites-available/${DOMINIO}" <<VHOST
# Redirige HTTP → HTTPS
server {
    listen 80;
    server_name ${DOMINIO};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMINIO};

    # SSL — Certbot completará esta sección
    # ssl_certificate y ssl_certificate_key se agregan automáticamente

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Rate limiting
    limit_req zone=launion_global burst=50 nodelay;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Proxy hacia la app
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
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx
ok "Nginx configurado para $DOMINIO"

# ── 5. Certbot — SSL gratuito con Let's Encrypt ────────────────────────────────
echo "[5/6] Obteniendo certificado SSL (Let's Encrypt)..."
warn "Asegurate de que el puerto 80 esté redirigido desde el router hacia este servidor"
warn "y que el hostname $DOMINIO apunte a tu IP pública antes de continuar."
echo ""
read -r -p "¿Ya está configurado el port forwarding y el DNS? (s/n): " CONFIRM
if [[ "$CONFIRM" =~ ^[Ss]$ ]]; then
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos \
    --email "admin@${DOMINIO}" --redirect
  ok "SSL activo para $DOMINIO"
else
  warn "Saltando SSL por ahora. Ejecutar después: certbot --nginx -d $DOMINIO"
fi

# ── 6. Fail2ban ────────────────────────────────────────────────────────────────
echo "[6/6] Configurando Fail2ban..."
cat > /etc/fail2ban/jail.local <<'JAIL'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled  = true
port     = ssh
maxretry = 3

[nginx-http-auth]
enabled  = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
action   = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath  = /var/log/nginx/error.log
maxretry = 10
findtime = 1m
bantime  = 30m
JAIL

systemctl enable fail2ban
systemctl restart fail2ban
ok "Fail2ban activo"

# ── Resumen ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✓ nginx-proxy configurado correctamente                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Dominio:    %-48s║\n" "https://$DOMINIO"
printf "║  Proxy a:    %-48s║\n" "http://$APP_IP:3000"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Comandos útiles:                                            ║"
echo "║    systemctl status nginx         # estado de Nginx          ║"
echo "║    systemctl status fail2ban      # estado de Fail2ban       ║"
echo "║    nginx -t                       # verificar configuración  ║"
echo "║    fail2ban-client status         # IPs baneadas             ║"
echo "║    certbot renew --dry-run        # test renovación SSL       ║"
echo "║                                                              ║"
echo "║  Para agregar una empresa nueva:                             ║"
echo "║    bash scripts/agregar-empresa-proxy.sh \\                  ║"
echo "║      --dominio nuevo.ddns.net --app-ip $APP_IP              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
