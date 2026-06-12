// RNFS-002: rate limiting de intentos de login fallidos por IP.
// Estado en memoria del proceso: la app corre como una única instancia
// systemd, por lo que no se necesita un store compartido (Redis/DB).
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

const intentosPorIp = new Map<string, number[]>();

function intentosVigentes(ip: string): number[] {
  const ahora = Date.now();
  const intentos = (intentosPorIp.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  intentosPorIp.set(ip, intentos);
  return intentos;
}

export function estaBloqueado(ip: string): boolean {
  return intentosVigentes(ip).length >= MAX_INTENTOS;
}

export function registrarIntentoFallido(ip: string): void {
  const intentos = intentosVigentes(ip);
  intentos.push(Date.now());
  intentosPorIp.set(ip, intentos);
}

export function limpiarIntentos(ip: string): void {
  intentosPorIp.delete(ip);
}
