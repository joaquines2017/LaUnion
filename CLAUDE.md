@AGENTS.md

# LaUnion — Guía para agentes de IA

## Qué es este proyecto

Sistema de costeo para una carpintería/mueblería. Calcula el costo de producción de muebles a partir de insumos, precios de proveedores y desperdicio. El flujo central es: **insumo → precio por proveedor → despiece del mueble → costo total**.

Leer `README.md` para documentación completa de funcionalidades y estructura.

---

## Stack y versiones críticas

- **Next.js 16.2.3** — App Router. Leer `node_modules/next/dist/docs/` antes de escribir código. `params` en route handlers es `Promise<{...}>`, siempre `await params`.
- **Prisma 5** con PostgreSQL 16
- **NextAuth v5** — `auth()` se importa de `@/lib/auth`, no de `next-auth`
- **Tailwind CSS v4** — sintaxis diferente a v3
- **shadcn/ui** — componentes en `src/components/ui/`

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

### Protección de rutas admin
```ts
if ((session.user as { role?: string }).role !== "administrador") {
  return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
}
```

### Auditoría
```ts
import { registrarLog } from "@/lib/auditoria";
// Llamar después de la operación exitosa — nunca rompe el flujo
registrarLog({ usuarioId, accion: "PRECIO_MODIFICADO", entidad: "PrecioProveedor", entidadId: id, datosAnteriores: {...}, datosNuevos: {...} });
```

### Session user type
El tipo de `session.user` no incluye `id` ni `role` por defecto — castear:
```ts
(session.user as { id?: string; role?: string }).id
```

---

## Estructura de la base de datos (resumen)

- `Insumo` → tiene muchos `PrecioProveedor` (uno por proveedor) y un `precioSeleccionado` opcional
- `Mueble` → tiene `DespieceMaterial[]` (placas/materiales con medidas) y `DespieceInsumo[]` (herrajes/gastos)
- `VersionDespiece` → snapshot de cada guardado del despiece (materiales + insumos como JSON)
- `MaterialResidual` → retazo con dimensiones; `ReservaResidual` lo asigna a un `Mueble` con cantidad
- `LogAuditoria` → registro de acciones; escribir siempre con `registrarLog()`
- `ConfiguracionGlobal` → singleton con id `"1"` (factorDesperdicio, moneda, vigenciaPrecioDias)

---

## Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/recalculo-cascada.ts` | Recálculo automático de costos de muebles al cambiar un precio |
| `src/lib/comparacion-residuales.ts` | Algoritmo que detecta si un retazo encaja en los cortes del despiece |
| `src/lib/lista-corte.ts` | Agrupa cortes del despiece por pieza idéntica entre muebles |
| `src/lib/importar-excel.ts` | Parser multi-hoja para importación masiva |
| `src/lib/auditoria.ts` | `registrarLog()` — wrapper seguro para `LogAuditoria` |
| `src/lib/formato.ts` | `formatearPrecio`, `formatearFecha`, `parsearNumero`, etc. |
| `src/proxy.ts` | Middleware de autenticación (protege todas las rutas del dashboard) |

---

## Convenciones de UI

- Clases CSS personalizadas: `na-table`, `na-badge`, `na-card-title`, `na-badge-blue`, `shadow-card`
- Toast con `sonner` para feedback: `toast.success(...)` / `toast.error(...)`
- Tablas con `na-table` en lugar de clases Tailwind repetidas
- Paginación: usar `PaginadorTabla` de `src/components/shared/`
- Búsqueda/filtros: usar `FiltrosBusqueda` de `src/components/shared/`

---

## Lo que NO hay (estado actual)

No existe UI para:
- Gestión de unidades de medida más allá de CRUD básico (ya está)
- Exportar residuales a Excel/PDF
- Dashboard de métricas de residuales
- Notificaciones por precios vencidos (solo alerta en dashboard)
