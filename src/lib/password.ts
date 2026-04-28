export function generarPasswordSeguro(longitud = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint8Array(longitud)))
    .map((b) => chars[b % chars.length])
    .join("");
}
