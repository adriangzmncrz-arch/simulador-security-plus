import { describe, expect, it } from "vitest";
import { BANK, BY } from "../../src/data";
import {
  PASS, TARGET, aggregate, band, latestResults, neededForPass, readiness, readinessChip, scaled,
} from "../../src/logic/scoring";
import { attempt } from "./helpers";

const firstOf = (d: number, n: number) => BANK.filter(q => q.domain === d).slice(0, n).map(q => q.id);

describe("scaled", () => {
  it("mapea 0..1 a 100..900", () => {
    expect(scaled(0)).toBe(100);
    expect(scaled(1)).toBe(900);
    expect(scaled(0.5)).toBe(500);
  });
  it("TARGET equivale a 750", () => {
    expect(scaled(TARGET)).toBe(PASS);
    expect(scaled(TARGET - 0.001)).toBeLessThan(PASS);
  });
  it("aciertos necesarios para 750", () => {
    expect(neededForPass(90)).toBe(74);
    expect(neededForPass(30)).toBe(25);
  });
});

describe("band", () => {
  it("umbrales de DESIGN.md §4", () => {
    expect(band(0.9, 10)).toEqual(["Fuerte", "ok"]);
    expect(band(0.85, 10)).toEqual(["Fuerte", "ok"]);
    expect(band(0.8125, 10)).toEqual(["En el límite", "mid"]);
    expect(band(0.7, 10)).toEqual(["Débil", "bad"]);
    expect(band(0.65, 10)).toEqual(["Débil", "bad"]);
    expect(band(0.64, 10)).toEqual(["Crítico", "bad"]);
    expect(band(0, 0)).toEqual(["Sin datos", ""]);
  });
  it("chip de proyección", () => {
    expect(readinessChip(790)[0]).toBe("Listo para agendar");
    expect(readinessChip(789)[0]).toBe("Al borde: refuerza");
    expect(readinessChip(750)[0]).toBe("Al borde: refuerza");
    expect(readinessChip(749)[0]).toBe("Aún no");
  });
});

describe("latestResults", () => {
  it("toma el último intento de cada pregunta y cuenta las vistas", () => {
    const [a, b] = firstOf(1, 2);
    const { last, seen } = latestResults([attempt({ [a]: 0, [b]: 1 }), attempt({ [a]: 1 })]);
    expect(last).toEqual({ [a]: 1, [b]: 1 });
    expect(seen).toEqual({ [a]: 2, [b]: 1 });
  });
  it("ignora IDs que ya no existen en el banco", () => {
    const [a] = firstOf(1, 1);
    const { last } = latestResults([attempt({ [a]: 1, "D9-999": 0 })]);
    expect(last).toEqual({ [a]: 1 });
  });
});

describe("aggregate y readiness", () => {
  it("agrega por dominio y objetivo con crédito parcial", () => {
    const [a, b] = firstOf(1, 2);
    const ag = aggregate({ [a]: 1, [b]: 0.5 });
    expect(ag.d[1]).toEqual({ c: 1.5, n: 2 });
    const objs = new Set([BY[a].objective, BY[b].objective]);
    expect(Object.keys(ag.o).sort()).toEqual([...objs].sort());
  });
  it("sin datos devuelve null", () => {
    expect(readiness({})).toBeNull();
    expect(readiness({ 1: { c: 0, n: 0 } })).toBeNull();
  });
  it("solo pondera los dominios con datos", () => {
    // Dominio 1 al 100 % y dominio 4 al 50 %: (0.12·1 + 0.28·0.5) / 0.40 = 0.65
    const rd = readiness({ 1: { c: 4, n: 4 }, 4: { c: 2, n: 4 } })!;
    expect(rd.r).toBeCloseTo(0.65, 10);
    expect(rd.cov).toBeCloseTo(0.40, 10);
    // Un solo dominio: la proyección es su precisión.
    expect(readiness({ 3: { c: 3, n: 4 } })!.r).toBeCloseTo(0.75, 10);
  });
  it("con todos los dominios es el promedio ponderado por los pesos del temario", () => {
    const rd = readiness({ 1: { c: 1, n: 1 }, 2: { c: 0, n: 1 }, 3: { c: 1, n: 1 }, 4: { c: 0, n: 1 }, 5: { c: 1, n: 1 } })!;
    expect(rd.r).toBeCloseTo(0.12 + 0.18 + 0.20, 10);
  });
});
