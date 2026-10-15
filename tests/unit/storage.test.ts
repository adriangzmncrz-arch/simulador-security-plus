import { afterEach, describe, expect, it, vi } from "vitest";
import { BANK } from "../../src/data";
import {
  LS_ATT, LS_CUR, exportFileName, exportPayload, importAttempts, isAttempt, loadAttempts, loadSession, lsGet, lsSet, mergeAttempts,
} from "../../src/storage";
import { attempt } from "./helpers";

function fakeStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    m,
  };
}
afterEach(() => { vi.unstubAllGlobals(); });

const [q1, q2, q3] = BANK.map(q => q.id);

describe("localStorage con try/catch", () => {
  it("devuelve el valor por defecto si el almacenamiento falla", () => {
    vi.stubGlobal("localStorage", { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceeded"); } });
    expect(lsGet("x", 42)).toBe(42);
    expect(() => lsSet("x", 1)).not.toThrow();
    expect(loadAttempts()).toEqual([]);
    expect(loadSession()).toBeNull();
  });
  it("devuelve el valor por defecto si el JSON está corrupto", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [LS_ATT]: "{no-json" }));
    expect(loadAttempts()).toEqual([]);
  });
  it("carga solo los intentos con forma válida, ordenados por fecha", () => {
    const a = attempt({ [q1]: 1 }, { id: "a_2", ts: 2 }), b = attempt({ [q2]: 0 }, { id: "a_1", ts: 1 });
    vi.stubGlobal("localStorage", fakeStorage({ [LS_ATT]: JSON.stringify([a, { id: "roto" }, b]) }));
    expect(loadAttempts().map(x => x.id)).toEqual(["a_1", "a_2"]);
  });
});

describe("loadSession", () => {
  it("descarta preguntas que ya no existen en el banco y conserva la actual", () => {
    const s = { label: "Examen 1", mode: "exam", qids: [q1, "D9-999", q2, q3], ans: { [q1]: 0 }, flags: ["D9-999", q3], revealed: {}, idx: 2, elapsed: 30, limit: 5400, feedback: false, ts: 1 };
    vi.stubGlobal("localStorage", fakeStorage({ [LS_CUR]: JSON.stringify(s) }));
    const out = loadSession()!;
    expect(out.qids).toEqual([q1, q2, q3]);
    expect(out.idx).toBe(1);
    expect(out.flags).toEqual([q3]);
    expect(out.elapsed).toBe(30);
  });
  it("devuelve null si no queda ninguna pregunta o el modo no es válido", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [LS_CUR]: JSON.stringify({ mode: "exam", qids: ["D9-999"], idx: 0 }) }));
    expect(loadSession()).toBeNull();
    vi.stubGlobal("localStorage", fakeStorage({ [LS_CUR]: JSON.stringify({ mode: "otro", qids: [q1], idx: 0 }) }));
    expect(loadSession()).toBeNull();
  });
});

describe("exportar e importar", () => {
  it("nombre de archivo con la fecha local", () => {
    expect(exportFileName(new Date(2026, 9, 5, 23, 59))).toBe("secplus-progreso-2026-10-05.json");
  });
  it("ida y vuelta reproduce el historial", () => {
    const list = [attempt({ [q1]: 1 }, { id: "a_1", ts: 1 }), attempt({ [q2]: 0.5 }, { id: "a_2", ts: 2, mode: "exam", scaled: 500 })];
    const text = JSON.stringify(exportPayload(list));
    const r = importAttempts([], text);
    expect(r.ok && r.attempts).toEqual(list);
    expect(r.ok && r.added).toBe(2);
  });
  it("fusiona por id sin duplicar y cuenta los inválidos", () => {
    const mine = [attempt({ [q1]: 1 }, { id: "a_1", ts: 10 })];
    const file = { version: 1, attempts: [mine[0], attempt({ [q2]: 0 }, { id: "a_0", ts: 5 }), { id: "a_x", ts: "ayer" }] };
    const r = importAttempts(mine, JSON.stringify(file));
    if (!r.ok) throw new Error(r.error);
    expect(r.attempts.map(a => a.id)).toEqual(["a_0", "a_1"]);
    expect([r.added, r.existing, r.invalid]).toEqual([1, 1, 1]);
    // Importar dos veces no duplica.
    const again = importAttempts(r.attempts, JSON.stringify(file));
    expect(again.ok && again.attempts).toHaveLength(2);
  });
  it("rechaza archivos que no son una exportación válida", () => {
    expect(importAttempts([], "{nope").ok).toBe(false);
    expect(importAttempts([], "[]").ok).toBe(false);
    expect(importAttempts([], JSON.stringify({ version: 2, attempts: [] })).ok).toBe(false);
    expect(importAttempts([], JSON.stringify({ version: 1 })).ok).toBe(false);
  });
  it("isAttempt exige los campos de DESIGN.md §3.2", () => {
    const a = attempt({ [q1]: 1 });
    expect(isAttempt(a)).toBe(true);
    expect(isAttempt({ ...a, mode: "otro" })).toBe(false);
    expect(isAttempt({ ...a, res: { [q1]: "1" } })).toBe(false);
    expect(isAttempt({ ...a, scaled: undefined })).toBe(false);
  });
  it("mergeAttempts ordena por fecha", () => {
    const out = mergeAttempts([attempt({}, { id: "b", ts: 2 })], [attempt({}, { id: "a", ts: 1 })]);
    expect(out.map(a => a.id)).toEqual(["a", "b"]);
  });
});
