import { BY } from "./data";
import type { Attempt, Session } from "./types";

export const LS_ATT = "secplus701.attempts", LS_CUR = "secplus701.current", LS_THEME = "secplus701.theme";

// Toda lectura y escritura va en try/catch: la app funciona aunque falle el almacenamiento.
export function lsGet<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; }
}
export function lsSet(k: string, v: unknown): void {
  try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}

/** Une por id (el último gana) y ordena por fecha. */
export function mergeAttempts(base: Attempt[], incoming: Attempt[]): Attempt[] {
  const m = new Map(base.map(a => [a.id, a]));
  incoming.forEach(a => { if (a && a.id) m.set(a.id, a); });
  return [...m.values()].sort((a, b) => a.ts - b.ts);
}

export function loadAttempts(): Attempt[] {
  const list = lsGet<unknown>(LS_ATT, []);
  return Array.isArray(list) ? mergeAttempts([], list.filter(isAttempt)) : [];
}
export const saveAttempts = (list: Attempt[]) => lsSet(LS_ATT, list);

/** Sesión en curso; descarta las preguntas que ya no existan en el banco. */
export function loadSession(): Session | null {
  const s = lsGet<Session | null>(LS_CUR, null);
  if (!s || typeof s !== "object" || !Array.isArray(s.qids) || !MODES.includes(s.mode)) return null;
  const qids = s.qids.filter(id => BY[id]);
  if (!qids.length) return null;
  const i = qids.indexOf(s.qids[s.idx]);
  const idx = i >= 0 ? i : Math.min(Math.max(0, Number(s.idx) || 0), qids.length - 1);
  return {
    label: String(s.label ?? ""), mode: s.mode, qids, idx,
    ans: s.ans && typeof s.ans === "object" ? s.ans : {},
    flags: Array.isArray(s.flags) ? s.flags.filter(id => BY[id]) : [],
    revealed: s.revealed && typeof s.revealed === "object" ? s.revealed : {},
    elapsed: Number(s.elapsed) || 0, limit: Number(s.limit) || 0, feedback: !!s.feedback, ts: Number(s.ts) || Date.now(),
  };
}
export const saveSession = (s: Session | null) => lsSet(LS_CUR, s);

const MODES = ["exam", "diag", "practice", "missed"];
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Comprueba la forma de un intento (al cargar o importar). */
export function isAttempt(a: unknown): a is Attempt {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return typeof x.id === "string" && x.id.length > 0 && isNum(x.ts) && typeof x.label === "string" &&
    MODES.includes(x.mode as string) && isNum(x.n) && isNum(x.score) && (x.scaled === null || isNum(x.scaled)) &&
    isNum(x.elapsed) && isNum(x.limit) && typeof x.timeUp === "boolean" &&
    !!x.res && typeof x.res === "object" && !Array.isArray(x.res) && Object.values(x.res).every(isNum) &&
    !!x.ans && typeof x.ans === "object" && Array.isArray(x.flags);
}
