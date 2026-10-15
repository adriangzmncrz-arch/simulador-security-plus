import { describe, expect, it } from "vitest";
import { BANK, BY, DOMAINS } from "../../src/data";
import {
  QUOTA30, QUOTA90, byDomain, fixedExam, missedSet, mulberry32, pbqFirst, practiceSet, shuffle, smartPick, weightedExam,
} from "../../src/logic/builders";
import { latestResults } from "../../src/logic/scoring";
import reference from "../fixtures/reference-exams.json";
import { attempt } from "./helpers";

const sum = (q: Record<number, number>) => Object.values(q).reduce((a, b) => a + b, 0);
const empty = { last: {}, seen: {} };
const isPbqFirst = (ids: string[]) => {
  const types = ids.map(id => BY[id].type === "match");
  const firstRest = types.indexOf(false);
  return firstRest === -1 || types.slice(firstRest).every(t => !t);
};

describe("RNG", () => {
  it("mulberry32 es determinista", () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 5 }, a), ys = Array.from({ length: 5 }, b);
    expect(xs).toEqual(ys);
    xs.forEach(x => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); });
  });
  it("shuffle devuelve una permutación sin modificar el original", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(src, mulberry32(1));
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(src);
  });
});

describe("cuotas", () => {
  it("suman 90 y 30", () => {
    expect(sum(QUOTA90)).toBe(90);
    expect(sum(QUOTA30)).toBe(30);
  });
});

describe("exámenes fijos", () => {
  const exams = [1, 2, 3].map(k => fixedExam(k));

  it("cada uno tiene 90 preguntas únicas y respeta las cuotas", () => {
    for (const ids of exams) {
      expect(ids).toHaveLength(90);
      expect(new Set(ids).size).toBe(90);
      for (const d of DOMAINS) expect(ids.filter(id => BY[id].domain === d)).toHaveLength(QUOTA90[d]);
    }
  });
  it("no comparten preguntas entre sí", () => {
    const all = exams.flat();
    expect(new Set(all).size).toBe(270);
  });
  it("las PBQ (match) van primero", () => {
    for (const ids of exams) {
      expect(isPbqFirst(ids)).toBe(true);
      expect(BY[ids[0]].type).toBe("match");
    }
  });
  it("el Examen 1 contiene las mismas 90 preguntas que el prototipo, en el mismo orden", () => {
    expect(reference.exam1).toHaveLength(90);
    expect(new Set(exams[0])).toEqual(new Set(reference.exam1));
    expect(exams[0]).toEqual(reference.exam1);
  });
  it("los Exámenes 2 y 3 también coinciden con el prototipo", () => {
    expect(exams[1]).toEqual(reference.exam2);
    expect(exams[2]).toEqual(reference.exam3);
  });
});

describe("pbqFirst", () => {
  it("separa match del resto y conserva todos los IDs", () => {
    const ids = BANK.slice(0, 40).map(q => q.id);
    const out = pbqFirst(ids, mulberry32(7));
    expect([...out].sort()).toEqual([...ids].sort());
    expect(isPbqFirst(out)).toBe(true);
  });
});

describe("smartPick y armados aleatorios", () => {
  it("prioriza no vistas, luego falladas, luego acertadas", () => {
    const pool = byDomain(1).slice(0, 6);
    const [ok1, ok2, bad1, bad2] = pool;
    const latest = latestResults([attempt({ [ok1]: 1, [ok2]: 1, [bad1]: 0, [bad2]: 0.5 })]);
    const picked = smartPick(pool, 6, mulberry32(3), latest);
    expect(new Set(picked.slice(0, 2))).toEqual(new Set(pool.slice(4)));
    expect(new Set(picked.slice(2, 4))).toEqual(new Set([bad1, bad2]));
    expect(new Set(picked.slice(4))).toEqual(new Set([ok1, ok2]));
  });
  it("weightedExam respeta las cuotas de 90 y 30 con PBQ primero", () => {
    for (const quota of [QUOTA90, QUOTA30]) {
      const ids = weightedExam(quota, empty, mulberry32(11));
      expect(ids).toHaveLength(sum(quota));
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of DOMAINS) expect(ids.filter(id => BY[id].domain === d)).toHaveLength(quota[d]);
      expect(isPbqFirst(ids)).toBe(true);
    }
  });
  it("practiceSet filtra por dominio u objetivo y limita al tamaño del pool", () => {
    const d2 = practiceSet("2", "all", 20, empty, mulberry32(5));
    expect(d2).toHaveLength(20);
    expect(d2.every(id => BY[id].domain === 2)).toBe(true);
    const o = practiceSet("all", "1.1", 999, empty, mulberry32(5));
    expect(o).toHaveLength(BANK.filter(q => q.objective === "1.1").length);
    expect(o.every(id => BY[id].objective === "1.1")).toBe(true);
  });
  it("missedSet devuelve las de último resultado < 1", () => {
    const [a, b, c] = byDomain(4);
    const latest = latestResults([attempt({ [a]: 0, [b]: 0.5, [c]: 0 }), attempt({ [c]: 1 })]);
    expect(new Set(missedSet(latest, mulberry32(1)))).toEqual(new Set([a, b]));
  });
});
