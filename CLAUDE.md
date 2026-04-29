@AGENTS.md

# LaUnion — Guía para agentes de IA

## Qué es este proyecto

Sistema de costeo para carpinterías/mueblerías con soporte multi-empresa. El superadmin crea empresas cliente; cada empresa tiene sus propios usuarios y datos. El flujo central es: **insumo → precio por proveedor → despiece del mueble → costo total**.

Leer `README.md` para documentación completa de funcionalidades y estructura.

---

## Stack y versiones críticas

- **Next.js 16.2.3** — App Router, Turbopack. Leer `node_modules/next/dist/docs/` antes de escribir código.
  - `params` en route handlers es `Promise<{...}>`, siempre `await params`
  - El middleware se define en `src/proxy.ts` (NO `middleware.ts` — está deprecado en esta versión)
- **Prisma 5** con PostgreSQL 16
- **NextAuth v5** — `auth()` se importa de `@/lib/auth`, no de `next-auth`
- **Tailwind CSS v4** — sintaxis diferente a v3
- **shadcn/ui** — componentes en `src/components/ui/`
- **nodemailer** — email via Gmail SMTP (no Resend)

---

## Patrones obligatorios

### Route handlers
```ts
// params SIEMPRE es Promise en Next.js 16
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // ...
}
```

### Protección por rol
```ts
// Admin de empresa
if ((session.user as { role?: string }).role !== "administrador") {
  return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
}

// Superadmin
if ((session.user as { role?: string }).role !== "superadmin") {
  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}
```

### Session user type
El tipo de `session.user` no incluye `id`, `role` ni `empresaId` por defecto — castear siempre:
```ts
const user = session.user as { id?: string; role?: string; empresaId?: string | null };
```

### Auditoría
```ts
import { registrarLog } from "@/lib/auditoria";
// Llamar después de la operación exitosa — nunca rompe el flujo
registrarLog({ usuarioId, accion: "PRECIO_MODIFICADO", entidad: "PrecioProveedor", entidadId: id, datosAnteriores: {...}, datosNuevos: {...} });
```

### Email
```ts
import { enviarPasswordInicial } from "@/lib/email";
// Siempre dentro de try/catch — el fallo no debe bloquear la operación principal
try {
  await enviarPasswordInicial({ email, nombreUsuario, nombreEmpresa, password, dominio });
} catch (err) {
  console.error("Error enviando email:", err);
}
```

### Fragmentos en tablas
Cuando se renderizan múltiples `<tr>` por item, usar `<Fragment key={id}>` (no `<>`):
```tsx
import { Fragment } from "react";
// ...
{items.map(item => (
  <Fragment key={item.id}>
    <tr>...</tr>
    {expanded && <tr>...</tr>}
  </Fragment>
))}
```

---

## Estructura de la base de datos (resumen)

- `Empresa` → empresa cliente; `usuarioId = null` en el superadmin
- `Usuario` → tiene `empresaId` (null solo para superadmin) y `rol` (superadmin/administrador/operador/lectura)
- `Insumo` → tiene muchos `PrecioProveedor` (uno por proveedor) y un `precioSeleccionado` opcional
- `Mueble` → tiene `DespieceMaterial[]` (placas/materiales con medidas) y `DespieceInsumo[]` (herrajes/gastos)
- `VersionDespiece` → snapshot de cada guardado del despiece (materiales + insumos como JSON)
- `MaterialResidual` → retazo con dimensiones; `ReservaResidual` lo asigna a un `Mueble` con cantidad
- `LogAuditoria` → registro de acciones; escribir siempre con `registrarLog()`
- `ConfiguracionGlobal` → singleton con id `"1"` (factorDesperdicio, moneda, vigenciaPrecioDias)

---

## Routing por rol (proxy.ts)

```
Login → superadmin   → /superadmin   (panel de empresas)
Login → administrador/operador/lectura → /  (dashboard operativo)

/superadmin/* → solo accesible por superadmin (redirige a / si otro rol)
/*            → no accesible por superadmin (redirige a /superadmin)
```

---

## Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `src/proxy.ts` | Middleware de autenticación + routing por rol |
| `src/lib/recalculo-cascada.ts` | Recálculo automático de costos de muebles al cambiar un precio |
| `src/lib/comparacion-residuales.ts` | Algoritmo que detecta si un retazo encaja en los cortes del despiece |
| `src/lib/lista-corte.ts` | Agrupa cortes del despiece por pieza idéntica entre muebles |
| `src/lib/importar-excel.ts` | Parser multi-hoja para importación masiva |
| `src/lib/auditoria.ts` | `registrarLog()` — wrapper seguro para `LogAuditoria` |
| `src/lib/email.ts` | `enviarPasswordInicial()` — Gmail SMTP con nodemailer |
| `src/lib/password.ts` | `generarPasswordSeguro()` — contraseñas aleatorias seguras |
| `src/lib/formato.ts` | `formatearPrecio`, `formatearFecha`, `parsearNumero`, etc. |

---

## Convenciones de UI

- Clases CSS personalizadas: `na-table`, `na-badge`, `na-card-title`, `na-badge-blue`, `shadow-card`
- Toast con `sonner` para feedback: `toast.success(...)` / `toast.error(...)`
- Tablas con `na-table` en lugar de clases Tailwind repetidas
- Paginación: usar `PaginadorTabla` de `src/components/shared/`
- Búsqueda/filtros: usar `FiltrosBusqueda` de `src/components/shared/`

---

## Lo que NO hay (estado actual)

- Exportar materiales residuales a Excel/PDF
- Dashboard de métricas de residuales
- Notificaciones por precios vencidos (solo alerta en dashboard)
- Aislamiento de datos por empresa en BD (actualmente todos comparten la misma DB — multi-tenancy por row pendiente)
