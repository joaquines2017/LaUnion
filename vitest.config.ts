import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // RFO-002: cargar variables de entorno desde env-test/.env.test en lugar
  // de buscar .env en la raíz del proyecto (en producción ese archivo tiene
  // permisos 600 y pertenece al usuario "launion", lo que provoca EACCES
  // al ejecutar vitest como otro usuario).
  envDir: path.resolve(__dirname, "env-test"),
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/prisma.ts", "src/lib/auth.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
