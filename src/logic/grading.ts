import type { Question } from "../types";

/** Puntaje de una respuesta: single y multi son todo o nada; match da crédito parcial. */
export function grade(q: Question, v: unknown): number {
  if (v == null) return 0;
  if (q.type === "single") return v === q.answer[0] ? 1 : 0;
  if (q.type === "multi") {
    if (!Array.isArray(v) || v.length !== q.answer.length) return 0;
    const a = [...v].sort().join(","), b = [...q.answer].sort().join(",");
    return a === b ? 1 : 0;
  }
  if (q.type === "match") {
    if (!Array.isArray(v)) return 0;
    let c = 0;
    q.answer.forEach((a, i) => { if (v[i] === a) c++; });
    return c / q.answer.length;
  }
  return 0;
}

/** Multi cuenta como respondida solo con exactamente tantas selecciones como respuestas correctas. */
export function answered(q: Question, v: unknown): boolean {
  if (v == null) return false;
  if (q.type === "single") return typeof v === "number";
  if (q.type === "multi") return Array.isArray(v) && v.length === q.answer.length;
  if (q.type === "match") return Array.isArray(v) && v.every(x => x != null);
  return false;
}

/** Alterna la opción i en multi; al exceder el número requerido se descarta la selección más antigua. */
export function toggleMulti(cur: unknown, i: number, need: number): number[] {
  let v: number[] = Array.isArray(cur) ? [...cur] : [];
  if (v.includes(i)) v = v.filter(x => x !== i);
  else { v.push(i); if (v.length > need) v.shift(); }
  return v;
}
