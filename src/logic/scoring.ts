import { BY, DOM, DOMAINS } from "../data";
import type { Agg, Attempt, DomainKey, Latest, Question } from "../types";

export const PASS = 750, TARGET = .8125;

/**
 * Estimación lineal 100–900. CompTIA no publica su fórmula: 750 equivale a r ≈ 0.8125.
 */
export const scaled = (r: number) => Math.round(100 + 800 * r);

export type Tone = "" | "ok" | "mid" | "bad";

export function band(r: number, n: number): [string, Tone] {
  if (!n) return ["Sin datos", ""];
  if (r >= .85) return ["Fuerte", "ok"];
  if (r >= TARGET) return ["En el límite", "mid"];
  if (r >= .65) return ["Débil", "bad"];
  return ["Crítico", "bad"];
}

export function barClass(r: number, n: number): Tone {
  if (!n) return "";
  return r >= .85 ? "ok" : r >= TARGET ? "mid" : "bad";
}

/** Chip de la proyección en la portada. */
export function readinessChip(sc: number): [string, Tone] {
  if (sc >= PASS + 40) return ["Listo para agendar", "ok"];
  if (sc >= PASS) return ["Al borde: refuerza", "mid"];
  return ["Aún no", "bad"];
}

/**
 * Estado de conocimiento: el resultado del último intento en que apareció cada pregunta.
 * Los IDs que ya no existen en el banco se ignoran.
 */
export function latestResults(attempts: Attempt[], by: Record<string, Question> = BY): Latest {
  const last: Record<string, number> = {}, seen: Record<string, number> = {};
  for (const a of attempts) {
    for (const [id, s] of Object.entries(a.res || {})) {
      if (!by[id]) continue;
      last[id] = s;
      seen[id] = (seen[id] || 0) + 1;
    }
  }
  return { last, seen };
}

export function aggregate(res: Record<string, number>, by: Record<string, Question> = BY) {
  const d: Partial<Record<DomainKey, Agg>> = {}, o: Record<string, Agg> = {};
  for (const [id, s] of Object.entries(res)) {
    const q = by[id]; if (!q) continue;
    const dd = (d[q.domain] ??= { c: 0, n: 0 }); dd.c += s; dd.n++;
    const oo = (o[q.objective] ??= { c: 0, n: 0 }); oo.c += s; oo.n++;
  }
  return { d, o };
}

/** Σ peso·precisión / Σ peso, solo sobre los dominios con datos. null si no hay datos. */
export function readiness(dAgg: Partial<Record<DomainKey, Agg>>): { r: number; cov: number } | null {
  let r = 0, wsum = 0;
  for (const k of DOMAINS) {
    const x = dAgg[k];
    if (x && x.n) { r += DOM[k].w * (x.c / x.n); wsum += DOM[k].w; }
  }
  return wsum ? { r: r / wsum, cov: wsum } : null;
}

/** Aciertos aproximados que hacen falta para 750 en un intento de n preguntas. */
export const neededForPass = (n: number) => Math.ceil(TARGET * n);
