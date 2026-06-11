import { z } from "zod";

// RNFS-006: política de contraseñas nuevas/editadas — mínimo 8 caracteres
// y al menos un número o carácter especial.
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[0-9!@#$%^&*(),.?":{}|<>_\-+=]/, "Debe incluir al menos un número o carácter especial");

export function generarPasswordSeguro(longitud = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint8Array(longitud)))
    .map((b) => chars[b % chars.length])
    .join("");
}
