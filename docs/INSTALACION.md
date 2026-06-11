# LaUnion — Guía de Instalación en Contenedores LXC

## Arquitectura

```
Red LAN (192.168.100.x)
│
├── launion-db   (192.168.100.190)  — PostgreSQL 18, SSH :2190
│     Puerto 5432 solo accesible desde launion-app
│
└── launion-app  (192.168.100.191)  — Node.js 20 + Next.js 16, SSH :2190
      Puerto 3000 — servicio systemd launion.service
      Directorio: /usr/fileserver/apps/launion-app/
```

> Para exposición pública agregar un tercer contenedor `nginx-proxy` con Nginx + SSL + Fail2ban.
> Consultar `scripts/setup-proxy.sh` para ese paso.

---

## Requisitos previos

- Proxmox VE con soporte LXC
- Plantilla LXC: **Ubuntu 22.04 (jammy)**
- Acceso root a Proxmox
- Conexión a Internet desde los contenedores (para descarga de paquetes)
- El código del proyecto disponible en un repositorio Git

---

## Parte 1 — Contenedor de base de datos (`launion-db`)

### 1.1 Crear el contenedor en Proxmox

En la UI de Proxmox o por consola del host:

```bash
# Crear contenedor LXC (ajustar VMID, storage y red según tu entorno)
pct create 190 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname launion-db \
  --memory 512 \
  --swap 512 \
  --cores 2 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.100.190/24,gw=192.168.100.1 \
  --nameserver 8.8.8.8 \
  --unprivileged 1 \
  --start 1
```

### 1.2 Acceder al contenedor y preparar el sistema

```bash
# Desde el host Proxmox
pct exec 190 -- bash

# Dentro del contenedor
apt-get update && apt-get install -y openssh-server sudo
```

### 1.3 Configurar usuario y SSH

```bash
# Crear usuario joaquin
useradd -m -s /bin/bash -G sudo joaquin
echo "joaquin:TU_PASSWORD" | chpasswd

# Configurar SSH para habilitar autenticación por contraseña (primera vez)
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Cambiar puerto SSH a 2190
echo "Port 2190" >> /etc/ssh/sshd_config

systemctl restart ssh
```

### 1.4 Instalar y configurar PostgreSQL

Copiar y ejecutar el script de instalación:

```bash
# Desde tu máquina local
scp -P 2190 scripts/setup-db.sh joaquin@192.168.100.190:/tmp/

# En el contenedor (como root)
bash /tmp/setup-db.sh \
  --db-password "TU_PASSWORD_DB_SEGURO" \
  --app-ip "192.168.100.191"
```

El script realiza automáticamente:
- Instala PostgreSQL 16 desde el repositorio oficial PGDG
- Crea el usuario `launion_user` y la base `launion` con encoding UTF-8
- Configura `pg_hba.conf` para aceptar conexiones de la IP de la app
- Habilita `listen_addresses = '*'`

> **Nota:** El servidor actualmente corre PostgreSQL **18**. Si querés instalar PG 18
> en lugar de PG 16, editá `setup-db.sh` y cambiá `postgresql-16` por `postgresql-18`.

### 1.5 Configurar logs de PostgreSQL

```bash
# Editar /etc/postgresql/18/main/postgresql.conf (ajustar versión según la instalada)
cat >> /etc/postgresql/18/main/postgresql.conf << 'EOF'

# Logging — agregado por instalación LaUnion
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_file_mode = 0640
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000   # Loguear queries > 1 segundo
log_checkpoints = on
log_connections = off
log_disconnections = off
log_lock_waits = on
log_line_prefix = '%t [%p] %q%u@%d '
EOF

systemctl reload postgresql
```

### 1.6 Verificación de la base de datos

```bash
# Verificar que PostgreSQL responde
sudo -u postgres psql -c "\l"

# Verificar conectividad desde la app (hacer esto desde launion-app)
psql -h 192.168.100.190 -U launion_user -d launion -c "SELECT version();"
```

---

## Parte 2 — Contenedor de aplicación (`launion-app`)

### 2.1 Crear el contenedor en Proxmox

```bash
pct create 191 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname launion-app \
  --memory 1024 \
  --swap 512 \
  --cores 2 \
  --rootfs local-lvm:16 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.100.191/24,gw=192.168.100.1 \
  --nameserver 8.8.8.8 \
  --unprivileged 1 \
  --start 1
```

### 2.2 Preparar el sistema

```bash
# Dentro del contenedor (pct exec 191 -- bash)
apt-get update && apt-get install -y openssh-server sudo git curl ca-certificates

useradd -m -s /bin/bash -G sudo joaquin
echo "joaquin:TU_PASSWORD" | chpasswd

sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
echo "Port 2190" >> /etc/ssh/sshd_config
systemctl restart ssh
```

### 2.3 Instalar la aplicación

Copiar y ejecutar el script de instalación:

```bash
# Desde tu máquina local
scp -P 2190 scripts/setup-app.sh joaquin@192.168.100.191:/tmp/

# En el contenedor (como root)
AUTH_SECRET=$(openssl rand -base64 32)

bash /tmp/setup-app.sh \
  --repo-url "https://github.com/TU_USUARIO/launion-app.git" \
  --db-url "postgresql://launion_user:TU_PASSWORD_DB@192.168.100.190:5432/launion" \
  --auth-secret "$AUTH_SECRET" \
  --app-url "http://192.168.100.191:3000"
```

> **Directorio en producción actual:** `/usr/fileserver/apps/launion-app/`
> El script usa `/opt/launion-app/` por defecto. Si querés usar la ruta de producción actual,
> editá `APP_DIR` en `setup-app.sh` antes de correr.

El script realiza automáticamente:
- Instala Node.js 20 via nodesource
- Crea el usuario de sistema `launion`
- Clona el repositorio
- Crea el `.env` con las variables de entorno
- Corre `npm ci`, `prisma generate`, `npm run build`
- Aplica migraciones con `prisma migrate deploy`
- Carga el seed inicial
- Instala y activa el servicio systemd `launion.service`

### 2.4 Variables de entorno (`.env`)

El archivo `.env` creado por el script contiene las variables mínimas. Para funcionalidad completa:

```env
# Base de datos
DATABASE_URL="postgresql://launion_user:PASSWORD@192.168.100.190:5432/launion"

# Auth
AUTH_SECRET="generado-con-openssl-rand-base64-32"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="http://192.168.100.191:3000"

# Email (Gmail SMTP con App Password)
# Configurar en: Google Account → Seguridad → Contraseñas de aplicación
GMAIL_USER="tu-cuenta@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Entorno
NODE_ENV=production
```

> Si no configurás las variables de email, la app funciona pero la creación de empresas
> no enviará las credenciales por correo (mostrará un error no fatal en los logs).

### 2.5 Configurar logging persistente

```bash
# Persistir los logs de journald (por defecto son volátiles en LXC)
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal

cat > /etc/systemd/journald.conf << 'EOF'
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=200M
SystemKeepFree=50M
SystemMaxFileSize=50M
MaxFileSec=1month
ForwardToSyslog=no
EOF

systemctl restart systemd-journald
```

### 2.6 Instalar script de visualización de logs

```bash
cat > /usr/local/bin/launion-logs << 'SCRIPT'
#!/usr/bin/env bash
# Ver logs del servicio LaUnion
# Uso: launion-logs [opciones]
#   -f        seguir en tiempo real
#   -n 100    últimas 100 líneas (default: 50)
#   -e        solo errores
#   --since "1 hour ago"

FOLLOW=""
LINES=50
PRIORITY=""
SINCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f)           FOLLOW="--follow"; shift ;;
    -n)           LINES="$2"; shift 2 ;;
    -e|--errors)  PRIORITY="--priority=err"; shift ;;
    --since)      SINCE="--since=$2"; shift 2 ;;
    *)            shift ;;
  esac
done

journalctl -u launion.service \
  -n "$LINES" \
  $FOLLOW \
  $PRIORITY \
  $SINCE \
  --output=short-precise \
  --no-pager
SCRIPT

chmod +x /usr/local/bin/launion-logs
```

### 2.7 Verificación final

```bash
# Estado del servicio
systemctl status launion

# Ver logs recientes
launion-logs -n 20

# Verificar que la app responde
curl -s http://localhost:3000 | head -5

# Verificar conectividad con la DB
journalctl -u launion -n 30 | grep -i "prisma\|database\|error"
```

---

## Parte 3 — Reinstalación desde cero con datos existentes

Si tenés un dump de la base de datos y querés migrar a nuevos contenedores:

### 3.1 Exportar datos del servidor actual

```bash
# En launion-db actual
sudo -u postgres pg_dump launion > /tmp/launion_backup.sql

# Copiar a tu máquina local
scp -P 2190 joaquin@192.168.100.190:/tmp/launion_backup.sql ./launion_backup.sql
```

### 3.2 Instalar nueva DB con los datos

```bash
# Copiar dump al nuevo contenedor
scp -P 2190 launion_backup.sql joaquin@NUEVA_IP_DB:/tmp/

# Correr setup con el dump
bash setup-db.sh \
  --db-password "TU_PASSWORD_DB" \
  --app-ip "NUEVA_IP_APP" \
  --dump-file /tmp/launion_backup.sql
```

### 3.3 Instalar nueva app

Seguir los pasos de la Parte 2 normalmente. Como la DB ya tiene datos, el seed fallará
silenciosamente (esto es el comportamiento esperado — el script lo maneja con `|| true`).

---

## Referencia rápida de comandos

### Servicio

| Comando | Descripción |
|---------|-------------|
| `systemctl status launion` | Ver estado del servicio |
| `systemctl restart launion` | Reiniciar la app |
| `systemctl stop launion` | Detener la app |
| `launion-logs -f` | Ver logs en tiempo real |
| `launion-logs -e` | Ver solo errores |
| `launion-logs --since "2 hours ago"` | Logs de las últimas 2 horas |

### Deploy / actualización

```bash
# En el contenedor launion-app (como root)
cd /usr/fileserver/apps/launion-app
bash scripts/deploy.sh
```

### Base de datos

```bash
# Conectarse
ssh -p 2190 joaquin@192.168.100.190
sudo -u postgres psql -d launion

# Ver logs de PostgreSQL
tail -f /var/log/postgresql/postgresql-18-main.log
# o para versión rotada
ls -lt /var/log/postgresql/

# Backup manual
ssh -p 2190 joaquin@192.168.100.190 "sudo -u postgres pg_dump launion | gzip > /tmp/backup_$(date +%Y%m%d).sql.gz"
```

### Clave SSH

Para agregar acceso SSH sin contraseña desde una máquina nueva:

```bash
# En la máquina nueva, obtener la clave pública
cat ~/.ssh/id_ed25519.pub

# Agregarla en el servidor (aceptar el host key la primera vez)
ssh -p 2190 joaquin@192.168.100.190 \
  "mkdir -p ~/.ssh && echo 'TU_CLAVE_PUBLICA' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

ssh -p 2190 joaquin@192.168.100.191 \
  "mkdir -p ~/.ssh && echo 'TU_CLAVE_PUBLICA' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

---

## Solución de problemas frecuentes

### La app no inicia

```bash
# Ver el error exacto
journalctl -u launion -n 50 --no-pager

# Causa frecuente: no puede conectar a la DB
# Verificar desde launion-app:
nc -zv 192.168.100.190 5432
```

### Error de Prisma al iniciar

```bash
# Regenerar cliente Prisma y reconstruir
cd /usr/fileserver/apps/launion-app
sudo -u launion npx prisma generate
sudo -u launion npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
systemctl restart launion
```

### La DB rechaza conexiones

```bash
# En launion-db: verificar pg_hba.conf
sudo cat /etc/postgresql/18/main/pg_hba.conf | grep launion

# Si falta la regla para la IP de la app:
echo "host    launion    launion_user    192.168.100.191/32    scram-sha-256" \
  >> /etc/postgresql/18/main/pg_hba.conf
systemctl reload postgresql
```

### El servicio reinicia en loop

```bash
# Ver el motivo del crash
journalctl -u launion --since "10 minutes ago" -p err

# Verificar que el .env existe y tiene las variables necesarias
cat /usr/fileserver/apps/launion-app/.env | grep -v PASSWORD
```
