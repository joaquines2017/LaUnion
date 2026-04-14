# LaUnion — Sistema de Costeo para Carpintería

Sistema web para calcular y gestionar precios de costo de muebles a partir de insumos y precios de proveedores. Cuando un proveedor actualiza precios, el recálculo en cascada actualiza automáticamente el costo de todos los muebles afectados.

## Stack

- **Next.js 16.2.3** (App Router, full-stack monolito)
- **PostgreSQL 16** via Prisma ORM 5
- **NextAuth.js v5** con autenticación por credenciales
- **Tailwind CSS v4** + shadcn/ui
- **ExcelJS** (exportación Excel) · **@react-pdf/renderer** (exportación PDF)

---

## Desarrollo local

### Requisitos
- Node.js 20+
- PostgreSQL 16 corriendo en `localhost:5432`

### Instalación

```bash
# 1. Clonar el repo
git clone https://github.com/<usuario>/launion-app.git
cd launion-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales locales

# 4. Crear base de datos y correr migraciones
npx prisma migrate dev

# 5. Cargar datos iniciales
npm run db:seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3000`.  
**Credenciales por defecto:** `admin@launion.com` / `admin1234`

### Variables de entorno (`.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/launion"
AUTH_SECRET="generado-con-openssl-rand-base64-32"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="http://localhost:3000"
```

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run db:migrate` | Aplicar nuevas migraciones (entorno dev) |
| `npm run db:seed` | Cargar datos iniciales |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:reset` | Resetear DB completa (⚠️ borra todos los datos) |

> **Tras cada `prisma migrate dev`** reiniciar el servidor: `pkill -f "next dev" && rm -rf .next && npm run dev`.  
> El cliente Prisma se cachea en `globalThis` y no detecta cambios de schema con hot-reload.

---

## Producción en Proxmox LXC

La arquitectura usa **2 contenedores LXC** Ubuntu 22.04:

```
Proxmox Host
├── launion-db  — PostgreSQL 16 nativo   (ej. IP 192.168.1.10)
└── launion-app — Node.js 20 standalone  (ej. IP 192.168.1.11)
```

Ambos contenedores deben estar en el mismo bridge de red (`vmbr0`) con IPs estáticas.

### 1. Configurar contenedor de base de datos (`launion-db`)

En la consola del LXC, como root:

```bash
git clone https://github.com/<usuario>/launion-app.git /tmp/launion
bash /tmp/launion/scripts/setup-db.sh \
  --db-password "PASSWORD_SEGURO" \
  --app-ip "192.168.1.11"
```

Este script instala PostgreSQL 16, crea el usuario `launion_user` y la base de datos `launion`, y configura el acceso desde la IP de la app.

### 2. Configurar contenedor de la app (`launion-app`)

En la consola del LXC, como root:

```bash
git clone https://github.com/<usuario>/launion-app.git /tmp/launion
bash /tmp/launion/scripts/setup-app.sh \
  --repo-url "https://github.com/<usuario>/launion-app.git" \
  --db-url "postgresql://launion_user:PASSWORD_SEGURO@192.168.1.10:5432/launion" \
  --auth-secret "$(openssl rand -base64 32)" \
  --app-url "http://192.168.1.11:3000"
```

Este script instala Node.js 20, clona el repo, hace el build, corre las migraciones, carga el seed y configura el servicio systemd que arranca la app automáticamente.

### 3. Actualizar a una nueva versión

Desde el LXC `launion-app`:

```bash
cd /opt/launion-app
sudo -u launion bash scripts/deploy.sh
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── proxy.ts              # Auth middleware (Next.js 16)
│   ├── api/                  # 20 endpoints REST
│   └── (dashboard)/          # Rutas protegidas
│       ├── page.tsx          # Dashboard
│       ├── insumos/
│       ├── proveedores/
│       ├── muebles/
│       ├── precios/
│       ├── reportes/
│       ├── importar/
│       └── configuracion/
├── components/
│   ├── muebles/              # TabDespiece, TabInsumos, AutocompletarInsumo
│   ├── insumos/              # FormInsumo, TablaPrecios, HistorialPrecios
│   ├── precios/              # GestionPrecios, ModalRecalculo
│   ├── proveedores/          # TablaPreciosProveedor
│   ├── configuracion/        # GestionCatalogo, FormConfiguracion
│   └── layout/               # Sidebar
└── lib/
    ├── recalculo-cascada.ts  # Recálculo automático de costos en cascada
    ├── calculo-costos.ts     # Cálculos de % placa y costos unitarios
    └── prisma.ts             # Singleton PrismaClient
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
scripts/
├── setup-db.sh               # Configuración inicial LXC base de datos
├── setup-app.sh              # Configuración inicial LXC aplicación
├── deploy.sh                 # Actualización de versión
└── service/
    └── launion.service       # Servicio systemd
```

## Funcionalidades

- **Insumos:** catálogo con precios por proveedor, alertas de precios desactualizados, historial
- **Gastos fijos:** insumos sin proveedor con precio base (electricidad, fletes, etc.)
- **Proveedores:** tabla interactiva de precios con edición inline
- **Muebles:** despiece con materiales (% placa automático) e insumos/gastos
- **Recálculo en cascada:** al cambiar cualquier precio actualiza automáticamente todos los muebles
- **Reportes:** lista de costos y comparativo de proveedores — exportar PDF/Excel
- **Importación masiva:** carga de insumos y precios desde .xlsx con preview
- **Configuración:** factor de desperdicio, vigencia de precios, categorías, unidades de medida
