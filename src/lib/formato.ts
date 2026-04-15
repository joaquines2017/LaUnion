/**
 * Formatea un número como precio en pesos argentinos (ARS).
 * Ej: 78000 → "$78.000"
 */
export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formatea un número para mostrar en campos de entrada (sin símbolo $).
 * Ej: 78000.5 → "78.000,50"
 */
export function formatearNumeroInput(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Parsea un string en formato argentino (punto=miles, coma=decimal) a número.
 * Acepta: "78.000,50", "78000,50", "78000.50", "78000", "1.500"
 */
export function parsearNumero(str: string): number {
  const s = str.trim();
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;

  let clean: string;
  if (dots > 0 && commas > 0) {
    // "1.500,50" → punto=miles, coma=decimal
    clean = s.replace(/\./g, "").replace(",", ".");
  } else if (commas === 1) {
    // "78000,50" → coma=decimal
    clean = s.replace(",", ".");
  } else if (dots > 1) {
    // "1.500.000" → varios puntos=miles
    clean = s.replace(/\./g, "");
  } else if (dots === 1) {
    // Un solo punto: si hay 3 dígitos después es separador de miles, si no es decimal
    const decimals = s.split(".")[1] ?? "";
    clean = decimals.length === 3 ? s.replace(".", "") : s;
  } else {
    clean = s;
  }

  return parseFloat(clean) || 0;
}

/**
 * Formatea una fecha en formato DD/MM/AAAA.
 */
export function formatearFecha(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
