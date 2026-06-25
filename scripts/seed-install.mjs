/**
 * seed-install.mjs — Datos de sistema para nueva instalación de LaUnion
 *
 * Crea únicamente el usuario superadmin de sistema (empresaId: null).
 * La empresa, el administrador y las categorías por defecto los crea
 * el wizard de primer arranque en /setup.
 *
 * Variables de entorno requeridas:
 *   INSTALL_SUPERADMIN_PASSWORD   Contraseña del superadmin (uso interno)
 *   DATABASE_URL                  Cadena de conexión PostgreSQL (o en .env)
 *
 * Uso: node scripts/seed-install.mjs
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const superadminPass = process.env.INSTALL_SUPERADMIN_PASSWORD

  if (!superadminPass) {
    console.error('Error: falta la variable INSTALL_SUPERADMIN_PASSWORD')
    process.exit(1)
  }

  console.log('\nCreando datos de sistema...\n')

  const existeSuperadmin = await prisma.usuario.findFirst({ where: { rol: 'superadmin' } })
  if (existeSuperadmin) {
    console.log('  ↷ Superadmin ya existe — omitiendo')
  } else {
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
    console.log('  ✓ Superadmin de sistema creado (superadmin@sistema.local)')
  }

  console.log('\n✓ Listo. Abrir el navegador en la URL del sistema para completar la configuración.\n')
}

main()
  .catch(e => { console.error('\nError en seed:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
