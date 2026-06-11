import { describe, it, expect } from "vitest";
import { generarPasswordSeguro, passwordSchema } from "@/lib/password";

const CHARS_VALIDOS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

describe("generarPasswordSeguro", () => {
  it("genera un password de la longitud por defecto (12)", () => {
    const pwd = generarPasswordSeguro();
    expect(pwd).toHaveLength(12);
  });

  it("genera un password de la longitud especificada", () => {
    expect(generarPasswordSeguro(8)).toHaveLength(8);
    expect(generarPasswordSeguro(20)).toHaveLength(20);
    expect(generarPasswordSeguro(1)).toHaveLength(1);
  });

  it("solo contiene caracteres del conjunto permitido", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generarPasswordSeguro(16);
      for (const char of pwd) {
        expect(CHARS_VALIDOS).toContain(char);
      }
    }
  });

  it("no contiene caracteres ambiguos (0, O, l, I)", () => {
    // El conjunto excluye 0, O, l, I para evitar confusión visual
    for (let i = 0; i < 50; i++) {
      const pwd = generarPasswordSeguro(16);
      expect(pwd).not.toMatch(/[0OlI]/);
    }
  });

  it("genera passwords distintos en cada llamada (aleatoriedad)", () => {
    const passwords = new Set(
      Array.from({ length: 20 }, () => generarPasswordSeguro())
    );
    // Con 20 generaciones de passwords de 12 chars, la probabilidad de colisión es mínima
    expect(passwords.size).toBeGreaterThan(18);
  });

  it("no genera string vacío", () => {
    expect(generarPasswordSeguro()).toBeTruthy();
  });
});

describe("passwordSchema (RNFS-006)", () => {
  it("rechaza contraseñas de menos de 8 caracteres", () => {
    expect(passwordSchema.safeParse("Abc123!").success).toBe(false);
  });

  it("rechaza contraseñas sin número ni símbolo", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
  });

  it("acepta contraseñas con 8+ caracteres y al menos un número", () => {
    expect(passwordSchema.safeParse("abcdefg1").success).toBe(true);
  });

  it("acepta contraseñas con 8+ caracteres y al menos un símbolo", () => {
    expect(passwordSchema.safeParse("abcdefg!").success).toBe(true);
  });
});
