#!/usr/bin/env bash
# =============================================================================
# setup-nginx-selfsigned.sh — HTTPS con nginx + certificado autofirmado
# RNFS-004: para despliegues en red interna (sin dominio público ni
# port-forwarding). Instala nginx en el mismo contenedor de la app, genera un
# certificado autofirmado y configura el reverse proxy a localhost:3000.
#
# Uso: sudo bash setup-nginx-selfsigned.sh [IP_O_HOST]
# Por defecto IP_O_HOST=192.168.100.191
# Idempotente: se puede correr de nuevo sin duplicar configuración.
# =============================================================================
set -euo pipefail

HOST="${1:-192.168.100.191}"
SSL_DIR="/etc/nginx/ssl"
CERT="$SSL_DIR/launion.crt"
KEY="$SSL_DIR/launion.key"
SITE="/etc/nginx/sites-available/launion"

echo "=== LaUnion — nginx + certificado autofirmado (RNFS-004) ==="
echo "  Host/IP: $HOST"
echo ""

# ── 1. Instalar nginx ─────────────────────────────────────────────────────────
echo "[1/4] Instalando nginx..."
apt-get update -qq
apt-get install -y -qq nginx

# ── 2. Generar certificado autofirmado (si no existe) ─────────────────────────
echo "[2/4] Certificado SSL..."
mkdir -p "$SSL_DIR"
if [[ -f "$CERT" && -f "$KEY" ]]; then
  echo "  Ya existe $CERT, no se regenera."
else
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$KEY" -out "$CERT" \
    -subj "/CN=$HOST" \
    -addext "subjectAltName=IP:$HOST"
  chmod 600 "$KEY"
  echo "  Generado $CERT (válido 10 años)."
fi

# ── 3. Configurar vhost ────────────────────────────────────────────────────────
echo "[3/4] Configurando vhost nginx..."
cat > "$SITE" <<NGINX
server {
    listen 80;
    server_name $HOST;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $HOST;

    ssl_certificate     $CERT;
    ssl_certificate_key $KEY;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINX

ln -sf "$SITE" /etc/nginx/sites-enabled/launion
rm -f /etc/nginx/sites-enabled/default

# ── 4. Activar ──────────────────────────────────────────────────────────────────
echo "[4/4] Activando nginx..."
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

echo ""
echo "✓ nginx configurado — https://$HOST (certificado autofirmado)"
echo ""
echo "Pasos restantes (manuales):"
echo "  1. En /etc/systemd/system/launion.service, cambiar HOSTNAME=0.0.0.0"
echo "     a HOSTNAME=127.0.0.1, luego: systemctl daemon-reload && systemctl restart launion"
echo "  2. En .env de la app, cambiar NEXTAUTH_URL a https://$HOST"
echo "     y reiniciar: systemctl restart launion"
