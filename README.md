# LaUnion — Sistema de Costeo para Carpintería

Sistema web para calcular y gestionar precios de costo de muebles a partir de insumos y precios de proveedores. Cuando un proveedor actualiza precios, el recálculo en cascada actualiza automáticamente el costo de todos los muebles afectados.

## Stack

- **Next.js 16.2.3** (App Router, full-stack monolito, Turbopack)
- **PostgreSQL 16** via Prisma ORM 5
- **NextAuth.js v5** con autenticación por credenciales (JWT, 30 min)
- **Tailwind CSS v4** + shadcn/ui
- **ExcelJS** (exportación/importación Excel) · **@react-pdf/renderer** (exportación PDF)
- **nodemailer** (email via Gmail SMTP) · **bcryptjs** (hash de contraseñas) · **zod** (validación)

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

**Credenciales por defecto (seed):**

| Email | Contraseña | Rol | Panel |
|-------|-----------|-----|-------|
| `superadmin@launion.com` | `superadmin1234` | superadmin | `/superadmin` — gestión de empresas |
| `admin@launion.com` | `admin1234` | administrador | `/` — dashboard operativo |

### Variables de entorno (`.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/launion"
AUTH_SECRET="generado-con-openssl-rand-base64-32"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="http://localhost:3000"

# Email — Gmail SMTP con App Password
# Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación
GMAIL_USER="tu-cuenta@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
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

Despliegue actual: **2 contenedores LXC** Ubuntu 24.04 en la red interna
`192.168.100.x` (sin dominio público ni exposición a internet):

```
Red LAN 192.168.100.x
├── launion-app (192.168.100.191) — Next.js (systemd, 127.0.0.1:3000)
│                                    + Nginx (SSL autofirmado, :80→:443)
│                                    + Fail2ban (SSH)
└── launion-db  (192.168.100.190) — PostgreSQL 18
                                     + Fail2ban (SSH)
```

Acceso: `https://192.168.100.191` (certificado autofirmado — el navegador
pide aceptar la excepción la primera vez).

Guía completa paso a paso: [`docs/INSTALACION.md`](docs/INSTALACION.md).

### 1. Contenedor de base de datos (`launion-db`)

```bash
git clone https://github.com/<usuario>/launion-app.git /tmp/launion
bash /tmp/launion/scripts/setup-db.sh \
  --db-password "PASSWORD_SEGURO" \
  --app-ip "192.168.100.191"
```

### 2. Contenedor de la app (`launion-app`)

```bash
git clone https://github.com/<usuario>/launion-app.git /tmp/launion
bash /tmp/launion/scripts/setup-app.sh \
  --repo-url "https://github.com/<usuario>/launion-app.git" \
  --db-url "postgresql://launion_user:PASSWORD_SEGURO@192.168.100.190:5432/launion" \
  --auth-secret "$(openssl rand -base64 32)" \
  --app-url "https://192.168.100.191"
```

### 3. HTTPS con certificado autofirmado (RNFS-004)

En `launion-app`, instala Nginx con un certificado autofirmado y hace
`proxy_pass` a `127.0.0.1:3000` (la app pasa a bindear solo localhost):

```bash
bash /tmp/launion/scripts/setup-nginx-selfsigned.sh 192.168.100.191
```

### 4. Fail2ban para SSH (RNFS-005)

En **ambos** contenedores (`launion-db` y `launion-app`), banea IPs con +3
intentos fallidos de SSH en 5 min (whitelistea la LAN `192.168.100.0/24`):

```bash
bash /tmp/launion/scripts/setup-fail2ban.sh
```

### 5. Actualizar a una nueva versión

```bash
cd /usr/fileserver/apps/launion-app
sudo -u launion bash scripts/deploy.sh
```

### Exposición pública (opcional, no usado actualmente)

Para exponer la app a internet con un dominio propio, agregar un tercer
contenedor `nginx-proxy` (Nginx + Certbot + Fail2ban + UFW + No-IP DDNS) con
`scripts/setup-proxy.sh`, y `scripts/agregar-empresa-proxy.sh` para sumar
dominios de empresas adicionales a ese proxy. No reemplaza al Nginx
autofirmado del paso 3 — es una capa adicional para el caso de exposición a
internet.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── proxy.ts                      # Auth middleware (Next.js 16)
│   ├── login/                        # Página de login
│   ├── api/
│   │   ├── auth/                     # NextAuth handlers
│   │   ├── auditoria/                # GET log de auditoría (solo admin)
│   │   ├── categorias-insumo/        # CRUD categorías de insumo
│   │   ├── categorias-mueble/        # CRUD categorías de mueble
│   │   ├── configuracion/            # GET/PATCH config global
│   │   ├── importar/
│   │   │   ├── route.ts              # POST importación masiva Excel
│   │   │   └── plantilla/route.ts    # GET descarga plantilla .xlsx
│   │   ├── insumos/                  # CRUD insumos
│   │   ├── lista-corte/
│   │   │   ├── route.ts              # GET lista de corte
│   │   │   ├── excel/route.ts        # GET exportar Excel
│   │   │   └── pdf/route.ts          # GET exportar PDF
│   │   ├── materiales-residuales/    # CRUD retazos + comparación
│   │   │   └── [id]/comparacion/     # GET análisis / POST asignar
│   │   ├── muebles/
│   │   │   └── [id]/
│   │   │       ├── despiece/route.ts # GET/PUT despiece (guarda versión)
│   │   │       ├── imagenes/         # POST/DELETE imágenes
│   │   │       └── versiones/route.ts# GET historial / POST restaurar
│   │   ├── precios/                  # POST upsert precio + cascada
│   │   ├── proveedores/              # CRUD proveedores
│   │   ├── reportes/
│   │   │   ├── costos/               # GET exportar PDF/Excel costos
│   │   │   └── despiece/[id]/        # GET PDF despiece por mueble
│   │   ├── superadmin/
│   │   │   └── empresas/
│   │   │       ├── route.ts          # GET lista / POST crear empresa + admin
│   │   │       └── [id]/
│   │   │           ├── route.ts      # PATCH editar / DELETE desactivar
│   │   │           ├── admin/route.ts# GET/PATCH editar admin / POST resetear contraseña
│   │   │           └── logo/route.ts # POST subir logo
│   │   ├── unidades-medida/          # CRUD unidades de medida
│   │   └── usuarios/                 # CRUD usuarios (solo admin de empresa)
│   ├── (superadmin)/                 # Panel exclusivo del superadmin
│   │   ├── layout.tsx                # Layout con sidebar propio
│   │   └── superadmin/
│   │       ├── page.tsx              # Lista de empresas
│   │       └── nueva/page.tsx        # Formulario nueva empresa
│   └── (dashboard)/                  # Rutas protegidas (layout con Sidebar)
│       ├── page.tsx                  # Dashboard
│       ├── insumos/
│       ├── proveedores/
│       ├── muebles/
│       ├── precios/
│       ├── residuales/
│       ├── lista-corte/
│       ├── reportes/
│       │   ├── costos/
│       │   └── proveedores/
│       ├── importar/
│       └── configuracion/
│           ├── page.tsx              # Config general
│           ├── categorias-mueble/
│           ├── categorias-insumo/
│           ├── unidades-medida/
│           ├── usuarios/             # Solo admin de empresa
│           └── auditoria/            # Solo admin de empresa
├── components/
│   ├── configuracion/
│   │   ├── FormConfiguracion.tsx
│   │   ├── GestionCatalogo.tsx       # Reutilizable: categorías, unidades
│   │   ├── GestionUsuarios.tsx       # CRUD usuarios con inline password reset
│   │   └── PanelAuditoria.tsx        # Log con búsqueda y expansión
│   ├── importar/
│   │   └── PaginaImportar.tsx        # Upload + preview + plantilla
│   ├── insumos/
│   │   ├── FormInsumo.tsx
│   │   ├── HistorialPrecios.tsx
│   │   └── TablaPrecios.tsx
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── muebles/
│   │   ├── AutocompletarInsumo.tsx
│   │   ├── DetalleMueble.tsx         # Tabs: datos / despiece / insumos + historial versiones
│   │   ├── FormMueble.tsx
│   │   ├── HistorialVersiones.tsx    # Panel colapsable con botón Restaurar
│   │   ├── TabDespiece.tsx           # Grilla de materiales con medidas
│   │   └── TabInsumos.tsx            # Grilla de insumos/gastos con cálculo % placa
│   ├── precios/
│   │   ├── GestionPrecios.tsx
│   │   └── ModalRecalculo.tsx
│   ├── proveedores/
│   │   └── TablaPreciosProveedor.tsx
│   ├── reportes/
│   │   ├── BotonesExportacion.tsx
│   │   ├── ListaCorte.tsx            # Componente PDF react-pdf
│   │   ├── ReporteCostosPDF.tsx
│   │   └── ReporteDespiece.tsx
│   ├── residuales/
│   │   ├── FormResidual.tsx
│   │   ├── PanelComparacion.tsx      # Comparación individual de retazo
│   │   ├── PanelComparacionMultiple.tsx # Comparación y asignación múltiple
│   │   └── TablaResiduales.tsx
│   ├── shared/
│   │   ├── AccionesTabla.tsx
│   │   ├── BotonEstado.tsx
│   │   ├── FiltrosBusqueda.tsx
│   │   └── PaginadorTabla.tsx
│   ├── superadmin/
│   │   ├── TablaEmpresas.tsx         # Lista editable + panel admin expandible
│   │   └── FormNuevaEmpresa.tsx      # Alta de empresa con envío de credenciales
│   └── ui/                           # shadcn/ui components
└── lib/
    ├── auditoria.ts                  # registrarLog() — nunca rompe el flujo
    ├── calculo-costos.ts
    ├── comparacion-residuales.ts     # Algoritmo de matching retazos ↔ cortes
    ├── email.ts                      # enviarPasswordInicial() — Gmail SMTP via nodemailer
    ├── formato.ts                    # formatearPrecio, formatearFecha, etc.
    ├── importar-excel.ts             # Parser Excel multi-hoja
    ├── lista-corte.ts                # getListaCorte(), sortFilas()
    ├── password.ts                   # generarPasswordSeguro() con crypto.getRandomValues
    ├── prisma.ts                     # Singleton PrismaClient
    ├── recalculo-cascada.ts          # Recálculo en cascada al cambiar precios
    └── utils.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

---

## Modelo de datos

### Entidades principales

| Modelo | Descripción |
|--------|-------------|
| `Empresa` | Empresa cliente con nombre, logo, dominio informativo y estado |
| `Proveedor` | Proveedor con datos de contacto y estado activo/inactivo |
| `CategoriaInsumo` / `CategoriaMueble` | Catálogos de categorías |
| `UnidadMedida` | Catálogo de unidades (placa, metro, unidad, kilo, etc.) |
| `Insumo` | Insumo con código, unidad de medida, dimensiones de placa y precio seleccionado |
| `PrecioProveedor` | Precio vigente por par insumo-proveedor (unique constraint) |
| `HistorialPrecio` | Registro inmutable de cada cambio de precio |
| `Mueble` | Mueble con código manual, categoría y costo calculado |
| `MuebleImagen` | Galería de imágenes por mueble |
| `DespieceMaterial` | Fila de material en el despiece (placa, vidrio, MDF, etc.) con medidas |
| `DespieceInsumo` | Fila de insumo/gasto en el despiece (tornillos, flete, etc.) |
| `VersionDespiece` | Snapshot completo del despiece guardado en cada `PUT /despiece` |
| `MaterialResidual` | Retazo disponible con dimensiones y stock |
| `ReservaResidual` | Asignación de retazos a muebles con cantidad |
| `Usuario` | Usuario del sistema con rol y password bcrypt |
| `ConfiguracionGlobal` | Singleton: factor de desperdicio, moneda, vigencia de precios |
| `LogAuditoria` | Registro de acciones (precios, muebles, despiece, usuarios) |

### Roles de usuario

| Rol | Permisos | Panel |
|-----|----------|-------|
| `superadmin` | Gestión de empresas del sistema (crear, editar, desactivar, resetear credenciales) | `/superadmin` |
| `administrador` | Acceso total dentro de su empresa: usuarios, auditoría, configuración | `/` |
| `operador` | Acceso a todas las funcionalidades operativas | `/` |
| `lectura` | Solo visualización | `/` |

> El `superadmin` no pertenece a ninguna empresa (`empresaId = null`). Los demás roles siempre pertenecen a una empresa.

---

## Funcionalidades

### Catálogo de insumos
- CRUD de insumos con categoría, unidad de medida y dimensiones de placa
- Precios por proveedor con historial de cambios
- Selección manual de precio activo o uso del mínimo vigente
- Alertas de precios desactualizados (configurable en días)

### Proveedores
- CRUD con tabla interactiva de precios por insumo y edición inline

### Muebles y despiece
- CRUD con código manual (ej: `05-147-000`), categoría e imágenes
- **Tab Despiece:** materiales principales con medidas (ancho×alto en cm), cálculo automático de % placa usado y costo
- **Tab Insumos:** insumos y gastos con cálculo unitario o % placa
- Costo total calculado automáticamente al guardar
- **Historial de versiones:** cada guardado genera un snapshot; panel colapsable con botón Restaurar (el estado actual se resguarda antes de restaurar)

### Recálculo en cascada
Al modificar el precio de un insumo, todos los muebles que lo usan recalculan su costo automáticamente.

### Materiales residuales (retazos)
- Registro de retazos con insumo, dimensiones y stock
- Filtros por insumo, estado y disponibilidad
- Comparación individual: detecta qué cortes del despiece encajan en el retazo (con rotación)
- **Comparación múltiple:** panel de asignación de varios retazos en simultáneo con barra de capacidad
- Asignación de retazos a muebles con cantidad parcial

### Lista de Corte
- Tabla consolidada de todos los cortes del despiece de muebles activos
- Agrupación de piezas idénticas entre muebles distintos
- Búsqueda por pieza, insumo o mueble
- Ordenamiento multi-columna clickeable
- Exportar a Excel y PDF (A4 apaisado con tabla formateada)

### Reportes
- **Lista de costos:** tabla paginada de muebles con costo, filtros por categoría, exportar Excel/PDF y PDF de despiece por mueble
- **Comparativo de proveedores:** matriz insumo × proveedor con precio mínimo resaltado

### Importación masiva
- Upload de archivo `.xlsx` con múltiples hojas
- Vista previa antes de confirmar (contadores por entidad + errores por fila)
- Descarga de plantilla Excel con todas las hojas y columnas documentadas
- Hojas soportadas: `Proveedores`, `CatInsumos`, `Insumos`, `Precios`, `CatMuebles`, `Muebles`, `DespiMat`, `DespiInsumos`, `Residuales`

### Superadmin — gestión de empresas (`/superadmin`)
- Panel exclusivo accesible solo con rol `superadmin`
- **Crear empresa:** nombre, dominio (informativo), logo + usuario administrador inicial
- Al crear: genera contraseña segura automáticamente y la envía por email (Gmail SMTP)
- **Editar empresa:** nombre, dominio, estado (activo/inactivo)
- **Panel de admin por empresa:** editar nombre de usuario, email y contraseña del administrador
- **Resetear y reenviar credenciales:** genera nueva contraseña y la envía por email
- Desactivar empresa desactiva también a todos sus usuarios

### Administración (solo rol administrador de empresa)
- **Gestión de usuarios:** crear, editar rol/estado, resetear contraseña, eliminar (con protección contra borrar el último admin o el propio usuario)
- **Log de auditoría:** registro de precios, muebles, despiece y usuarios con datos antes/después, búsqueda y paginación
- **Configuración global:** factor de desperdicio, moneda, días de vigencia de precios
- **Catálogos:** categorías de muebles, categorías de insumos, unidades de medida

---

## Convenciones de desarrollo

### APIs
- Toda ruta requiere sesión activa (`auth()`) — retorna 401 si no está autenticado
- Rutas de empresa-admin verifican `role === "administrador"` — retorna 403
- Rutas de superadmin verifican `role === "superadmin"` — retorna 403
- Validación con `zod` antes de tocar la base de datos
- Errores devuelven `{ error: string }` con el status HTTP correspondiente

### Email (Gmail SMTP)
- Función `enviarPasswordInicial()` en `src/lib/email.ts` usa nodemailer con Gmail SMTP
- Requiere variables `GMAIL_USER` y `GMAIL_APP_PASSWORD` (App Password de Google, no la contraseña normal)
- El envío nunca bloquea el flujo: si falla, la operación continúa y devuelve `emailError` en la respuesta

### Auditoría
- Usar `registrarLog()` de `src/lib/auditoria.ts` para registrar acciones importantes
- La función captura excepciones internamente: nunca rompe el flujo principal
- Acciones registradas: `PRECIO_CREADO/MODIFICADO`, `MUEBLE_MODIFICADO/DESACTIVADO`, `DESPIECE_MODIFICADO/RESTAURADO`, `USUARIO_CREADO/MODIFICADO/ELIMINADO`, `EMPRESA_CREADA/MODIFICADA/DESACTIVADA`, `ADMIN_EMPRESA_MODIFICADO`, `CREDENCIALES_REENVIADAS`

### Versiones del despiece
- Cada `PUT /api/muebles/[id]/despiece` guarda el estado anterior como `VersionDespiece`
- El número de versión es incremental por mueble
- Al restaurar, el estado actual también se versiona antes de sobreescribir

### Componentes
- Páginas en `(dashboard)/` y `(superadmin)/` son Server Components cuando no necesitan estado
- Componentes interactivos usan `"use client"` y reciben datos iniciales por props
- Toast con `sonner` para feedback de acciones
- Fragmentos en listas de tabla: usar `<Fragment key={...}>` en lugar de `<>` para evitar warnings de React
