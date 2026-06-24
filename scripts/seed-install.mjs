/**
 * seed-install.mjs — Datos iniciales para nueva instalación de LaUnion
 *
 * Variables de entorno requeridas:
 *   INSTALL_EMPRESA_NOMBRE      Nombre de la empresa del cliente
 *   INSTALL_EMPRESA_DOMINIO     IP o dominio del servidor (informativo)
 *   INSTALL_ADMIN_NOMBRE        Nombre de usuario del administrador
 *   INSTALL_ADMIN_EMAIL         Email del administrador
 *   INSTALL_ADMIN_PASSWORD      Contraseña del administrador
 *   INSTALL_SUPERADMIN_PASSWORD Contraseña del superadmin de sistema
 *   DATABASE_URL                Cadena de conexión PostgreSQL (o en .env)
 *
 * Uso: node scripts/seed-install.mjs
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const empresaNombre   = process.env.INSTALL_EMPRESA_NOMBRE?.trim()
  const empresaDominio  = process.env.INSTALL_EMPRESA_DOMINIO?.trim()
  const adminNombre     = process.env.INSTALL_ADMIN_NOMBRE?.trim()
  const adminEmail      = process.env.INSTALL_ADMIN_EMAIL?.trim()
  const adminPassword   = process.env.INSTALL_ADMIN_PASSWORD
  const superadminPass  = process.env.INSTALL_SUPERADMIN_PASSWORD

  if (!empresaNombre || !adminNombre || !adminEmail || !adminPassword || !superadminPass) {
    console.error('Error: faltan variables de entorno requeridas.')
    console.error('  INSTALL_EMPRESA_NOMBRE, INSTALL_ADMIN_NOMBRE,')
    console.error('  INSTALL_ADMIN_EMAIL, INSTALL_ADMIN_PASSWORD,')
    console.error('  INSTALL_SUPERADMIN_PASSWORD')
    process.exit(1)
  }

  console.log('\nCargando datos iniciales...\n')

  // ── Empresa ────────────────────────────────────────────────────────────────
  let empresa = await prisma.empresa.findFirst()
  if (empresa) {
    console.log(`  ↷ Empresa "${empresa.nombre}" ya existe — omitiendo`)
  } else {
    empresa = await prisma.empresa.create({
      data: { nombre: empresaNombre, dominio: empresaDominio || null, estado: 'activo' },
    })
    console.log(`  ✓ Empresa: ${empresa.nombre}`)
  }

  // ── Configuración global ───────────────────────────────────────────────────
  await prisma.configuracionGlobal.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      empresaId: empresa.id,
      factorDesperdicio: 1.10,
      moneda: 'ARS',
      vigenciaPrecioDias: 30,
    },
  })
  console.log('  ✓ Configuración global (factor desperdicio 10%, moneda ARS, vigencia 30 días)')

  // ── Superadmin de sistema (mantenimiento interno) ──────────────────────────
  const existeSuperadmin = await prisma.usuario.findFirst({ where: { rol: 'superadmin' } })
  if (!existeSuperadmin) {
    const hash = await bcrypt.hash(superadminPass, 12)
    await prisma.usuario.create({
      data: {
        nombreUsuario: 'superadmin',
        email: 'superadmin@sistema.local',
        passwordHash: hash,
        rol: 'superadmin',
        estado: 'activo',
        empresaId: null,
      },
    })
    console.log('  ✓ Superadmin de sistema')
  } else {
    console.log('  ↷ Superadmin ya existe — omitiendo')
  }

  // ── Administrador de la empresa ────────────────────────────────────────────
  const existeAdmin = await prisma.usuario.findUnique({ where: { email: adminEmail } })
  if (!existeAdmin) {
    const hash = await bcrypt.hash(adminPassword, 12)
    await prisma.usuario.create({
      data: {
        nombreUsuario: adminNombre,
        email: adminEmail,
        passwordHash: hash,
        rol: 'administrador',
        estado: 'activo',
        empresaId: empresa.id,
      },
    })
    console.log(`  ✓ Administrador: ${adminEmail}`)
  } else {
    console.log(`  ↷ Usuario ${adminEmail} ya existe — omitiendo`)
  }

  // ── Categorías de insumos (genéricas para carpintería) ────────────────────
  const catInsumos = [
    { nombre: 'Melamina',          descripcion: 'Placas de melamina en distintos colores y espesores' },
    { nombre: 'MDF',               descripcion: 'Placas de MDF crudo o melamínico' },
    { nombre: 'Fibrofácil',        descripcion: 'Placas de fibrocemento para fondos' },
    { nombre: 'Aglomerado',        descripcion: 'Placas de aglomerado de madera' },
    { nombre: 'Ranurado',          descripcion: 'Placas ranuradas para estanterías' },
    { nombre: 'Bisagras',          descripcion: 'Bisagras de distintos tipos y ángulos' },
    { nombre: 'Correderas',        descripcion: 'Rieles y correderas para cajones' },
    { nombre: 'Tornillería',       descripcion: 'Tornillos y fijaciones' },
    { nombre: 'Cerraduras',        descripcion: 'Cerraduras para cajones y vitrinas' },
    { nombre: 'Tiradores',         descripcion: 'Tiradores y manijas' },
    { nombre: 'Vidrios y Espejos', descripcion: 'Vidrios float y espejos varios' },
    { nombre: 'Patas y Ruedas',    descripcion: 'Patas y ruedas para muebles' },
    { nombre: 'Iluminación',       descripcion: 'Componentes eléctricos para muebles' },
    { nombre: 'Kits',              descripcion: 'Kits pre-armados para placards y corredizas' },
    { nombre: 'Tapa Canto',        descripcion: 'Cintas de borde para melamina' },
    { nombre: 'Placas Especiales', descripcion: 'Placas con tratamientos especiales' },
    { nombre: 'Accesorios',        descripcion: 'Escuadras, molduras, silicona y varios' },
  ]

  let catInsumosCreadas = 0
  for (const cat of catInsumos) {
    const existe = await prisma.categoriaInsumo.findUnique({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: cat.nombre } },
    })
    if (!existe) {
      await prisma.categoriaInsumo.create({ data: { ...cat, empresaId: empresa.id } })
      catInsumosCreadas++
    }
  }
  console.log(`  ✓ ${catInsumosCreadas} categorías de insumos`)

  // ── Categorías de muebles ──────────────────────────────────────────────────
  const catMuebles = [
    'Placard', 'Biblioteca', 'Cajonera', 'Mostrador',
    'Mesa', 'Estante', 'Vitrina', 'Aparador',
    'Botinero', 'Espejo', 'Otro',
  ]

  let catMueblesCreadas = 0
  for (const nombre of catMuebles) {
    const existe = await prisma.categoriaMueble.findUnique({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre } },
    })
    if (!existe) {
      await prisma.categoriaMueble.create({ data: { nombre, empresaId: empresa.id } })
      catMueblesCreadas++
    }
  }
  console.log(`  ✓ ${catMueblesCreadas} categorías de muebles`)

  console.log('\n✓ Datos iniciales cargados correctamente\n')
}

main()
  .catch(e => { console.error('\nError en seed de instalación:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
