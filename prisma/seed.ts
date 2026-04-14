import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Configuración global ────────────────────────────────────────────────
  await prisma.configuracionGlobal.upsert({
    where: { id: "1" },
    update: {},
    create: { id: "1", factorDesperdicio: 1.10, moneda: "ARS", vigenciaPrecioDias: 30 },
  });

  // ── Usuarios ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12);
  await prisma.usuario.upsert({
    where: { email: "admin@launion.com" },
    update: {},
    create: {
      nombreUsuario: "admin",
      email: "admin@launion.com",
      passwordHash: adminHash,
      rol: "administrador",
    },
  });

  // ── Categorías de insumos ───────────────────────────────────────────────
  const categoriasData = [
    { nombre: "Melamina", descripcion: "Placas de melamina en distintos colores y espesores" },
    { nombre: "MDF", descripcion: "Placas de MDF crudo o melamínico" },
    { nombre: "Fibrofácil", descripcion: "Placas de fibrocemento para fondos" },
    { nombre: "Aglomerado", descripcion: "Placas de aglomerado de madera" },
    { nombre: "Ranurado", descripcion: "Placas ranuradas para estanterías" },
    { nombre: "Bisagras", descripcion: "Bisagras de distintos tipos y ángulos" },
    { nombre: "Correderas", descripcion: "Rieles y correderas para cajones" },
    { nombre: "Tornillería", descripcion: "Tornillos y fijaciones" },
    { nombre: "Cerraduras", descripcion: "Cerraduras para cajones y vitrinas" },
    { nombre: "Tiradores", descripcion: "Tiradores y manijas" },
    { nombre: "Vidrios y Espejos", descripcion: "Vidrios float y espejos varios" },
    { nombre: "Patas y Ruedas", descripcion: "Patas y ruedas para muebles" },
    { nombre: "Iluminación", descripcion: "Componentes eléctricos para muebles" },
    { nombre: "Kits", descripcion: "Kits pre-armados para placards y corredizas" },
    { nombre: "Accesorios", descripcion: "Escuadras, molduras, silicona y varios" },
    { nombre: "Tapa Canto", descripcion: "Cintas de borde para melamina" },
    { nombre: "Placas Especiales", descripcion: "Placas con tratamientos especiales" },
  ];

  const categorias: Record<string, string> = {};
  for (const cat of categoriasData) {
    const c = await prisma.categoriaInsumo.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
    categorias[cat.nombre] = c.id;
  }
  console.log(`✓ ${categoriasData.length} categorías de insumos`);

  // ── Categorías de muebles ───────────────────────────────────────────────
  const catsMueble = [
    "Mostrador", "Botinero", "Placard", "Biblioteca",
    "Mesa", "Estante", "Cajonera", "Vitrina", "Aparador",
    "Espejo", "Otro",
  ];
  for (const nombre of catsMueble) {
    await prisma.categoriaMueble.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`✓ ${catsMueble.length} categorías de muebles`);

  // ── Proveedores ─────────────────────────────────────────────────────────
  const proveedoresData = [
    { nombre: "Vancar", email: "", telefono: "" },
    { nombre: "Herrajes Ya", email: "", telefono: "" },
    { nombre: "Diego", email: "", telefono: "" },
    { nombre: "RYA", email: "", telefono: "" },
    { nombre: "Electrolumin", email: "", telefono: "" },
    { nombre: "Molina Vidrios", email: "", telefono: "" },
    { nombre: "Martín", email: "", telefono: "" },
    { nombre: "Madernoa", email: "", telefono: "" },
  ];

  const proveedores: Record<string, string> = {};
  for (const prov of proveedoresData) {
    const p = await prisma.proveedor.upsert({
      where: { id: prov.nombre }, // usar nombre como clave temporal
      update: {},
      create: { nombre: prov.nombre },
    });
    proveedores[prov.nombre] = p.id;
  }

  // Re-leer por nombre para obtener IDs reales
  const provDB = await prisma.proveedor.findMany();
  for (const p of provDB) {
    proveedores[p.nombre] = p.id;
  }
  console.log(`✓ ${proveedoresData.length} proveedores`);

  // ── Insumos con precios ─────────────────────────────────────────────────
  interface InsumoSeed {
    codigo: string;
    descripcion: string;
    categoria: string;
    unidadMedida: string;
    espesormm?: number;
    altoM?: number;
    anchoM?: number;
    precios: { proveedor: string; precio: number }[];
  }

  const insumosData: InsumoSeed[] = [
    // ── MELAMINA ──
    {
      codigo: "04-100-0001",
      descripcion: "Placa de Melamina 18mm Blanca (2,83 x 1,83 m)",
      categoria: "Melamina", unidadMedida: "placa",
      espesormm: 18, altoM: 2.83, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 78000 }],
    },
    {
      codigo: "04-100-0012",
      descripcion: "Placa de Melamina Negra 18mm (2,83 x 1,83 m)",
      categoria: "Melamina", unidadMedida: "placa",
      espesormm: 18, altoM: 2.83, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 99000 }],
    },
    // ── MDF ──
    {
      codigo: "04-100-MDF-C9",
      descripcion: "Placa MDF Crudo 9mm (2,75 x 1,83 m)",
      categoria: "MDF", unidadMedida: "placa",
      espesormm: 9, altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 49500 }],
    },
    {
      codigo: "04-100-MDF-C15",
      descripcion: "Placa MDF Crudo 15mm (2,75 x 1,83 m)",
      categoria: "MDF", unidadMedida: "placa",
      espesormm: 15, altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 56000 }],
    },
    {
      codigo: "04-100-MDF-C18",
      descripcion: "Placa MDF Crudo 18mm (2,75 x 1,83 m)",
      categoria: "MDF", unidadMedida: "placa",
      espesormm: 18, altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 79500 }],
    },
    {
      codigo: "04-100-1130",
      descripcion: "Placa MDF Blanco 18mm (2,75 x 1,83 m)",
      categoria: "MDF", unidadMedida: "placa",
      espesormm: 18, altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 103000 }],
    },
    {
      codigo: "04-100-0039",
      descripcion: "Placa MDF Color Roble Dakar 18mm",
      categoria: "MDF", unidadMedida: "placa",
      espesormm: 18, altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 145000 }, { proveedor: "Madernoa", precio: 121811 }],
    },
    // ── FIBROFÁCIL ──
    {
      codigo: "04-100-0017",
      descripcion: "Fibro Plus Blanco 1,80 x 2,60 m",
      categoria: "Fibrofácil", unidadMedida: "placa",
      altoM: 2.60, anchoM: 1.80,
      precios: [{ proveedor: "Diego", precio: 41000 }],
    },
    // ── AGLOMERADO ──
    {
      codigo: "04-100-AGM-B",
      descripcion: "Placa de Aglomerado Blanco 18mm",
      categoria: "Aglomerado", unidadMedida: "placa",
      espesormm: 18, altoM: 2.81, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 78000 }],
    },
    {
      codigo: "04-100-AGM-C",
      descripcion: "Placa de Aglomerado Color 18mm",
      categoria: "Aglomerado", unidadMedida: "placa",
      espesormm: 18, altoM: 2.81, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 108000 }],
    },
    {
      codigo: "04-100-AGM-N",
      descripcion: "Placa de Aglomerado Negro 183 x 281",
      categoria: "Aglomerado", unidadMedida: "placa",
      espesormm: 18, altoM: 2.81, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 99000 }],
    },
    // ── RANURADO ──
    {
      codigo: "04-100-RAN-B",
      descripcion: "Placa de Ranurado Blanco 275 x 183",
      categoria: "Ranurado", unidadMedida: "placa",
      altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 145000 }],
    },
    {
      codigo: "04-100-RAN-N",
      descripcion: "Placa de Ranurado Negro 275 x 183",
      categoria: "Ranurado", unidadMedida: "placa",
      altoM: 2.75, anchoM: 1.83,
      precios: [{ proveedor: "Diego", precio: 150000 }],
    },
    // ── BISAGRAS ──
    {
      codigo: "04-100-0107",
      descripcion: "Bisagra Codo 0° 35mm",
      categoria: "Bisagras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 402 }, { proveedor: "Diego", precio: 795 }],
    },
    {
      codigo: "04-10-0015",
      descripcion: "Bisagra Codo 0° 35mm Cierre Suave",
      categoria: "Bisagras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 985 }, { proveedor: "Diego", precio: 2370 }],
    },
    {
      codigo: "04-100-0096",
      descripcion: "Bisagra Codo 9° 35mm",
      categoria: "Bisagras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 405 }, { proveedor: "Diego", precio: 795 }],
    },
    {
      codigo: "04-100-0120",
      descripcion: "Bisagra Codo 18° 35mm",
      categoria: "Bisagras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 405 }, { proveedor: "Diego", precio: 795 }],
    },
    {
      codigo: "04-100-0126",
      descripcion: "Bisagra Codo 18° 35mm Cierre Suave",
      categoria: "Bisagras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 985 }, { proveedor: "Diego", precio: 2370 }],
    },
    // ── CORREDERAS ──
    {
      codigo: "04-100-0007",
      descripcion: "Corredera Metálica 30cm Tipo Z",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 1791 }, { proveedor: "Diego", precio: 1791 }],
    },
    {
      codigo: "04-100-0008",
      descripcion: "Corredera Metálica 35cm",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Diego", precio: 2005 }],
    },
    {
      codigo: "04-100-0009",
      descripcion: "Corredera Metálica 40cm",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Diego", precio: 2280 }],
    },
    {
      codigo: "04-100-COR-TEL25",
      descripcion: "Corredera Telescópica 25cm Liviana",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 2190 }, { proveedor: "Diego", precio: 2250 }],
    },
    {
      codigo: "04-100-COR-TEL30",
      descripcion: "Corredera Telescópica 30cm Liviana",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 3055 }, { proveedor: "Diego", precio: 2700 }],
    },
    {
      codigo: "04-100-0098",
      descripcion: "Corredera Telescópica 35cm Liviana",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 2605 }, { proveedor: "Diego", precio: 3150 }],
    },
    {
      codigo: "04-100-0109",
      descripcion: "Corredera Telescópica 40cm Liviana",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 3463 }, { proveedor: "Diego", precio: 3600 }],
    },
    {
      codigo: "04-100-0127",
      descripcion: "Corredera Telescópica Pesada 50cm",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 6465 }, { proveedor: "Diego", precio: 6060 }],
    },
    {
      codigo: "04-100-COR-PES30CS",
      descripcion: "Corredera Telescópica Pesada 30cm Cierre Suave",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Diego", precio: 8320 }],
    },
    {
      codigo: "04-100-COR-PES40CS",
      descripcion: "Corredera Telescópica Pesada 40cm Cierre Suave",
      categoria: "Correderas", unidadMedida: "par",
      precios: [{ proveedor: "Herrajes Ya", precio: 8190 }, { proveedor: "Diego", precio: 9960 }],
    },
    // ── TORNILLERÍA ──
    {
      codigo: "04-100-0004",
      descripcion: "Tornillo Mitto Fix 4x45 (x 1000)",
      categoria: "Tornillería", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 17.20 }, { proveedor: "Diego", precio: 26.50 }],
    },
    {
      codigo: "04-100-0003",
      descripcion: "Tornillo 3.5x16 Dix Nacional",
      categoria: "Tornillería", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 8.16 }, { proveedor: "Diego", precio: 9.43 }],
    },
    {
      codigo: "04-100-0002",
      descripcion: "Tornillo 4x45",
      categoria: "Tornillería", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 35.00 }],
    },
    {
      codigo: "04-100-0020",
      descripcion: "Tornillo Mitto Fix 3.5x30",
      categoria: "Tornillería", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 13.00 }, { proveedor: "Diego", precio: 30.00 }],
    },
    // ── CERRADURAS ──
    {
      codigo: "04-100-0054",
      descripcion: "Cerradura para Cajón Cuadrada",
      categoria: "Cerraduras", unidadMedida: "unidad",
      precios: [
        { proveedor: "Vancar", precio: 1550 },
        { proveedor: "Herrajes Ya", precio: 1532 },
        { proveedor: "Diego", precio: 1550 },
      ],
    },
    {
      codigo: "04-100-1025",
      descripcion: "Cerradura para Cajón de Empuje",
      categoria: "Cerraduras", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 2640 }, { proveedor: "Diego", precio: 2520 }],
    },
    {
      codigo: "04-100-0055",
      descripcion: "Cerradura de Vitrina Tipo Serrucho",
      categoria: "Cerraduras", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 3870 }],
    },
    // ── TIRADORES ──
    {
      codigo: "04-100-0014",
      descripcion: "Manija PVC Bari 96mm",
      categoria: "Tiradores", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 280 }],
    },
    {
      codigo: "04-100-0062",
      descripcion: "Tirador Madera Formosa",
      categoria: "Tiradores", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 610 }],
    },
    {
      codigo: "04-100-TIR-AL3",
      descripcion: "Tirador Manija 3 mts Aluminio",
      categoria: "Tiradores", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 15408 }],
    },
    {
      codigo: "04-100-TIR-INOX96",
      descripcion: "Tirador Manija 96mm Acero Inox",
      categoria: "Tiradores", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 720 }],
    },
    // ── VIDRIOS Y ESPEJOS ──
    {
      codigo: "04-100-0021",
      descripcion: "Vidrio Float 4mm (placa)",
      categoria: "Vidrios y Espejos", unidadMedida: "placa",
      espesormm: 4,
      precios: [{ proveedor: "Martín", precio: 111000 }],
    },
    // ── TAPA CANTO ──
    {
      codigo: "04-100-0010",
      descripcion: "Tapa Canto Blanco 22mm (rollo 50 mts)",
      categoria: "Tapa Canto", unidadMedida: "rollo",
      precios: [{ proveedor: "Diego", precio: 13900 }],
    },
    {
      codigo: "04-100-1136",
      descripcion: "Tapa Canto Blanco 52mm",
      categoria: "Tapa Canto", unidadMedida: "rollo",
      precios: [{ proveedor: "Diego", precio: 18600 }],
    },
    {
      codigo: "04-100-0016",
      descripcion: "Tapa Canto Color",
      categoria: "Tapa Canto", unidadMedida: "rollo",
      precios: [{ proveedor: "Diego", precio: 24500 }],
    },
    {
      codigo: "04-100-0914",
      descripcion: "Tapa Canto Negro (x 50 mts)",
      categoria: "Tapa Canto", unidadMedida: "rollo",
      precios: [{ proveedor: "Diego", precio: 24500 }],
    },
    // ── ILUMINACIÓN ──
    {
      codigo: "04-100-0024",
      descripcion: "Lámpara LED para Maquilladores y Espejos",
      categoria: "Iluminación", unidadMedida: "unidad",
      precios: [{ proveedor: "RYA", precio: 1800 }],
    },
    {
      codigo: "04-100-0099",
      descripcion: "Transformador 5 Amper",
      categoria: "Iluminación", unidadMedida: "unidad",
      precios: [{ proveedor: "RYA", precio: 15000 }],
    },
    {
      codigo: "04-100-0095",
      descripcion: "Transformador 10 Amper",
      categoria: "Iluminación", unidadMedida: "unidad",
      precios: [{ proveedor: "RYA", precio: 20000 }],
    },
    {
      codigo: "04-100-KIT-LED",
      descripcion: "Kit Tira LED x 5 mts con Transformador",
      categoria: "Iluminación", unidadMedida: "juego",
      precios: [{ proveedor: "Herrajes Ya", precio: 20000 }],
    },
    // ── PATAS Y RUEDAS ──
    {
      codigo: "04-100-1139",
      descripcion: "Pata de Aluminio Gris Redonda c/ Regatón 10cm (x12)",
      categoria: "Patas y Ruedas", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 1492 }],
    },
    {
      codigo: "04-100-RUE-CF",
      descripcion: "Rueda con Freno",
      categoria: "Patas y Ruedas", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 3500 }],
    },
    {
      codigo: "04-100-RUE-SF",
      descripcion: "Rueda sin Freno",
      categoria: "Patas y Ruedas", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 2150 }],
    },
    // ── KITS ──
    {
      codigo: "04-100-KIT-D52",
      descripcion: "Kit D-52 para Placard",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Herrajes Ya", precio: 13988 }],
    },
    {
      codigo: "04-100-KIT-GR150",
      descripcion: "Kit Granero 1,50m",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Diego", precio: 45000 }],
    },
    {
      codigo: "04-100-KIT-GR200",
      descripcion: "Kit Granero 2,00m",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Diego", precio: 49000 }],
    },
    {
      codigo: "04-100-KIT-GR300",
      descripcion: "Kit Granero 3,00m",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Diego", precio: 58000 }],
    },
    {
      codigo: "04-100-KIT-PL200",
      descripcion: "Kit para Placard 2,00m",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Herrajes Ya", precio: 74600 }],
    },
    {
      codigo: "04-100-KIT-PL300",
      descripcion: "Kit para Placard 3,00m",
      categoria: "Kits", unidadMedida: "juego",
      precios: [{ proveedor: "Herrajes Ya", precio: 80000 }],
    },
    // ── ACCESORIOS ──
    {
      codigo: "04-100-0035",
      descripcion: "Silicona x5",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 3100 }],
    },
    {
      codigo: "04-100-0006",
      descripcion: "Moldura F Ángulo Externo PVC 3.2 Esquinero x metro",
      categoria: "Accesorios", unidadMedida: "metro",
      precios: [{ proveedor: "Herrajes Ya", precio: 1600 }, { proveedor: "Diego", precio: 3300 }],
    },
    {
      codigo: "04-100-0011",
      descripcion: "Soporte Lateral para Caño Oval (x50)",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 190 }, { proveedor: "Diego", precio: 310 }],
    },
    {
      codigo: "04-100-0015",
      descripcion: "Caño Oval x 3 metros Cromado",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 6029 }, { proveedor: "Diego", precio: 7340 }],
    },
    {
      codigo: "04-100-0027",
      descripcion: "Toma Corriente para Espejo o Maquillador con Llave de Luz",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 3600 }],
    },
    {
      codigo: "04-100-0013",
      descripcion: "Soporte Pituto para Estantes (x300)",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Herrajes Ya", precio: 19 }, { proveedor: "Diego", precio: 38.50 }],
    },
    {
      codigo: "04-100-0130",
      descripcion: "Pistón a Gas 100 N",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [{ proveedor: "Diego", precio: 1650 }],
    },
    {
      codigo: "04-100-FLETE",
      descripcion: "Flete",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [],
    },
    {
      codigo: "04-100-ELEC",
      descripcion: "Electricidad (gasto por unidad)",
      categoria: "Accesorios", unidadMedida: "unidad",
      precios: [],
    },
  ];

  let insumosCreados = 0;
  let preciosCreados = 0;

  for (const ins of insumosData) {
    const catId = categorias[ins.categoria];
    if (!catId) {
      console.warn(`⚠️  Categoría no encontrada: ${ins.categoria}`);
      continue;
    }

    const insumo = await prisma.insumo.upsert({
      where: { codigo: ins.codigo },
      update: {
        descripcion: ins.descripcion,
        unidadMedida: ins.unidadMedida,
        espesormm: ins.espesormm ?? null,
        altoM: ins.altoM ?? null,
        anchoM: ins.anchoM ?? null,
      },
      create: {
        codigo: ins.codigo,
        descripcion: ins.descripcion,
        categoriaId: catId,
        unidadMedida: ins.unidadMedida,
        espesormm: ins.espesormm ?? null,
        altoM: ins.altoM ?? null,
        anchoM: ins.anchoM ?? null,
      },
    });
    insumosCreados++;

    for (const pp of ins.precios) {
      const provId = proveedores[pp.proveedor];
      if (!provId) {
        console.warn(`⚠️  Proveedor no encontrado: ${pp.proveedor}`);
        continue;
      }

      await prisma.precioProveedor.upsert({
        where: { proveedorId_insumoId: { proveedorId: provId, insumoId: insumo.id } },
        update: { precio: pp.precio, fechaVigencia: new Date() },
        create: {
          proveedorId: provId,
          insumoId: insumo.id,
          precio: pp.precio,
        },
      });
      preciosCreados++;
    }
  }

  console.log(`✓ ${insumosCreados} insumos`);
  console.log(`✓ ${preciosCreados} precios cargados`);
  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\nCredenciales de acceso:");
  console.log("  Email:      admin@launion.com");
  console.log("  Contraseña: admin1234");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
