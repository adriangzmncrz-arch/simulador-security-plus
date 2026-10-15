/** Tope por tick: si el navegador congela la pestaña más tiempo, no se descuenta de golpe. */
export const MAX_TICK_S = 120;
export const WARN_S = 600, CRIT_S = 300;

/** Segundos reales transcurridos entre dos marcas, con tope de MAX_TICK_S. */
export const tickDelta = (lastT: number, now: number) => Math.max(0, Math.min((now - lastT) / 1000, MAX_TICK_S));

export function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}

/** Cuenta regresiva si hay límite; si no, tiempo transcurrido. */
export function clock(elapsed: number, limit: number): { text: string; cls: "" | "warn" | "crit" } {
  if (!limit) return { text: fmtTime(elapsed), cls: "" };
  const left = limit - elapsed;
  return { text: fmtTime(left), cls: left <= CRIT_S ? "crit" : left <= WARN_S ? "warn" : "" };
}

/**
 * Llama a onTick(dt) cada segundo con el tiempo real transcurrido desde el tick anterior.
 * No cuenta ticks: si el navegador espacia los intervalos (pestaña en segundo plano),
 * dt refleja el tiempo real. Devuelve la función para detenerlo.
 */
export function startTicker(onTick: (dt: number) => void, now: () => number = Date.now): () => void {
  let lastT = now();
  const h = setInterval(() => {
    const t = now(), dt = tickDelta(lastT, t);
    lastT = t;
    onTick(dt);
  }, 1000);
  return () => clearInterval(h);
}
