import type { NextConfig } from "next";

// RNFS-003: security headers.
// CSP permite 'unsafe-inline'/'unsafe-eval' porque Next.js inyecta scripts
// y estilos inline para hidratación/Tailwind sin usar nonces. HSTS queda
// declarado para cuando RNFS-004 (HTTPS vía nginx) esté activo; los
// navegadores la ignoran sobre HTTP plano.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript se verifica localmente con tsc --noEmit antes de cada commit.
  // Saltarlo en el build del servidor ahorra ~700 MB de RAM (crítico en CT con 2 GiB).
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      // Redirige URLs legacy /uploads/... al route handler /api/uploads/...
      // (las imágenes subidas antes del cambio de arquitectura seguirán funcionando)
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
