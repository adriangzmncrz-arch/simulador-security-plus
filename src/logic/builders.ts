import { BANK, BY, DOMAINS } from "../data";
import type { DomainKey, Latest, Question } from "../types";

export type Rnd = () => number;
export type Quota = Record<DomainKey, number>;

export const QUOTA90: Quota = {1:11,2:20,3:16,4:25,5:18};
export const QUOTA30: Quota = {1:4,2:7,3:5,4:8,5:6};

export function mulberry32(a: number): Rnd {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sobre una copia. */
export function shuffle<T>(arr: readonly T[], rnd: Rnd): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const seedNow = () => Date.now() % 2147483647;

/** IDs del dominio en el orden del banco. */
export const byDomain = (d: DomainKey, bank: Question[] = BANK) => bank.filter(q => q.domain === d).map(q => q.id);

/** Primero las match (estilo PBQ) barajadas, luego el resto barajado, con el mismo generador. */
export function pbqFirst(ids: string[], rnd: Rnd, by: Record<string, Question> = BY): string[] {
  const pbq = ids.filter(id => by[id].type === "match"), rest = ids.filter(id => by[id].type !== "match");
  return shuffle(pbq, rnd).concat(shuffle(rest, rnd));
}

/**
 * Examen fijo k (1..3): por dominio baraja con semilla 701 + dominio y toma el tramo
 * [(k-1)·cuota, k·cuota). El orden final usa la semilla 70100 + k.
 */
export function fixedExam(k: number, bank: Question[] = BANK, by: Record<string, Question> = BY): string[] {
  const rnd = mulberry32(70100 + k), ids: string[] = [];
  for (const d of DOMAINS) {
    const pool = shuffle(byDomain(d, bank), mulberry32(701 + d));
    ids.push(...pool.slice((k - 1) * QUOTA90[d], k * QUOTA90[d]));
  }
  return pbqFirst(ids, rnd, by);
}

/** Prioriza las no vistas, luego las falladas: (vista ? 2 : 0) + (último = 1 ? 1 : 0) + random·0.9. */
export function smartPick(pool: string[], n: number, rnd: Rnd, latest: Latest): string[] {
  const { seen, last } = latest;
  const scored = pool.map(id => ({ id, k: (seen[id] ? 1 : 0) * 2 + (last[id] === 1 ? 1 : 0) + rnd() * .9 }));
  scored.sort((a, b) => a.k - b.k);
  return scored.slice(0, n).map(x => x.id);
}

export function weightedExam(quota: Quota, latest: Latest, rnd: Rnd = mulberry32(seedNow())): string[] {
  const ids: string[] = [];
  for (const d of DOMAINS) ids.push(...smartPick(byDomain(d), quota[d], rnd, latest));
  return pbqFirst(ids, rnd);
}

/** dom: "all" o "1".."5"; obj: "all" o "x.y". */
export function practiceSet(dom: string, obj: string, n: number, latest: Latest, rnd: Rnd = mulberry32(seedNow())): string[] {
  const pool = BANK.filter(q => (dom === "all" || q.domain === +dom) && (obj === "all" || q.objective === obj)).map(q => q.id);
  return shuffle(smartPick(pool, Math.min(n, pool.length), rnd, latest), rnd);
}

/** IDs cuyo último resultado es < 1. */
export function missedSet(latest: Latest, rnd: Rnd = mulberry32(seedNow())): string[] {
  const { last } = latest;
  return shuffle(Object.keys(last).filter(id => last[id] < 1), rnd);
}

/** Un orden barajado de opciones para cada pregunta single o multi de la lista. */
export function optionOrders(ids: string[], rnd: Rnd, by: Record<string, Question> = BY): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of ids) {
    const q = by[id];
    if (q?.options) out[id] = shuffle(q.options.map((_, i) => i), rnd);
  }
  return out;
}

/** Orden guardado si es una permutación válida de las opciones actuales; si no, el orden del banco. */
export function orderOf(q: Question, order: unknown): number[] {
  const n = q.options?.length ?? 0;
  if (Array.isArray(order) && order.length === n && [...order].sort((a, b) => a - b).every((x, i) => x === i)) return order;
  return Array.from({ length: n }, (_, i) => i);
}
