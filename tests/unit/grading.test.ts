import { describe, expect, it } from "vitest";
import { answered, grade, toggleMulti } from "../../src/logic/grading";
import { match, multi, single } from "./helpers";

describe("grade", () => {
  it("single: 1 si coincide, 0 si no", () => {
    expect(grade(single, 2)).toBe(1);
    expect(grade(single, 1)).toBe(0);
    expect(grade(single, undefined)).toBe(0);
    expect(grade(single, null)).toBe(0);
  });
  it("multi: todo o nada, sin importar el orden", () => {
    expect(grade(multi, [1, 3])).toBe(1);
    expect(grade(multi, [3, 1])).toBe(1);
    expect(grade(multi, [1, 2])).toBe(0);
    expect(grade(multi, [1])).toBe(0);
    expect(grade(multi, [1, 3, 4])).toBe(0);
    expect(grade(multi, 1)).toBe(0);
  });
  it("match: crédito parcial = aciertos / items", () => {
    expect(grade(match, [0, 2, 1, 2])).toBe(1);
    expect(grade(match, [0, 2, 0, 0])).toBe(0.5);
    expect(grade(match, [0, null, null, null])).toBe(0.25);
    expect(grade(match, [1, 0, 0, 0])).toBe(0);
    expect(grade(match, "x")).toBe(0);
  });
});

describe("answered", () => {
  it("single: hay un número", () => {
    expect(answered(single, 0)).toBe(true);
    expect(answered(single, undefined)).toBe(false);
    expect(answered(single, "0")).toBe(false);
  });
  it("multi: exactamente tantas selecciones como respuestas correctas", () => {
    expect(answered(multi, [0, 4])).toBe(true);
    expect(answered(multi, [0])).toBe(false);
    expect(answered(multi, [])).toBe(false);
    expect(answered(multi, [0, 1, 2])).toBe(false);
  });
  it("match: todos los items tienen categoría", () => {
    expect(answered(match, [0, 0, 0, 0])).toBe(true);
    expect(answered(match, [0, null, 0, 0])).toBe(false);
    expect(answered(match, undefined)).toBe(false);
  });
});

describe("toggleMulti", () => {
  it("agrega y quita selecciones", () => {
    expect(toggleMulti(undefined, 2, 2)).toEqual([2]);
    expect(toggleMulti([2], 4, 2)).toEqual([2, 4]);
    expect(toggleMulti([2, 4], 2, 2)).toEqual([4]);
  });
  it("al exceder el número requerido descarta la más antigua", () => {
    expect(toggleMulti([2, 4], 0, 2)).toEqual([4, 0]);
    expect(toggleMulti([1, 2, 3], 5, 3)).toEqual([2, 3, 5]);
  });
  it("no modifica el arreglo original", () => {
    const cur = [1, 2];
    toggleMulti(cur, 3, 2);
    expect(cur).toEqual([1, 2]);
  });
});
