#!/usr/bin/env bash
# =============================================================================
# setup-fail2ban.sh — Fail2ban para SSH (RNFS-005)
# Banea IPs con +3 intentos fallidos de SSH en 5 min.
#
# Uso: sudo bash setup-fail2ban.sh
# Idempotente: se puede correr de nuevo sin duplicar configuración.
# =============================================================================
set -euo pipefail

JAIL_LOCAL="/etc/fail2ban/jail.local"
SSH_PORT="2190"
IGNORE_IP="127.0.0.1/8 ::1 192.168.100.0/24"

echo "=== LaUnion — Fail2ban para SSH (RNFS-005) ==="
echo ""

# ── 1. Instalar fail2ban ────────────────────────────────────────────────────
echo "[1/2] Instalando fail2ban..."
apt-get update -qq
apt-get install -y -qq fail2ban

# ── 2. Configurar jail de sshd ──────────────────────────────────────────────
echo "[2/2] Configurando jail sshd..."
cat > "$JAIL_LOCAL" <<EOF
[sshd]
enabled  = true
port     = $SSH_PORT
maxretry = 3
findtime = 5m
bantime  = 1h
ignoreip = $IGNORE_IP
EOF

systemctl enable --now fail2ban
fail2ban-client reload

echo ""
echo "✓ fail2ban activo — jail sshd: puerto $SSH_PORT, maxretry=3, findtime=5m, bantime=1h"
echo "  ignoreip = $IGNORE_IP"
