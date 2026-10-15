import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_TICK_S, clock, fmtTime, startTicker, tickDelta } from "../../src/logic/timer";

describe("tickDelta", () => {
  it("usa la diferencia de tiempo real", () => {
    expect(tickDelta(1000, 2000)).toBe(1);
    expect(tickDelta(0, 60_000)).toBe(60);
  });
  it("tope de 120 s por tick y nunca negativo", () => {
    expect(tickDelta(0, 10 * 60_000)).toBe(MAX_TICK_S);
    expect(tickDelta(5000, 1000)).toBe(0);
  });
});

describe("fmtTime y clock", () => {
  it("formatea m:ss y h:mm:ss", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(65)).toBe("1:05");
    expect(fmtTime(90 * 60)).toBe("1:30:00");
    expect(fmtTime(-5)).toBe("0:00");
  });
  it("cuenta regresiva con warn ≤ 10 min y crit ≤ 5 min", () => {
    expect(clock(0, 5400)).toEqual({ text: "1:30:00", cls: "" });
    expect(clock(5400 - 601, 5400).cls).toBe("");
    expect(clock(5400 - 600, 5400).cls).toBe("warn");
    expect(clock(5400 - 300, 5400).cls).toBe("crit");
  });
  it("sin límite muestra el tiempo transcurrido", () => {
    expect(clock(125, 0)).toEqual({ text: "2:05", cls: "" });
  });
});

describe("startTicker", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("suma tiempo real aunque los ticks se espacien (pestaña en segundo plano)", () => {
    vi.useFakeTimers();
    let t = 0, total = 0;
    const stop = startTicker(dt => { total += dt; }, () => t);
    // 3 ticks normales
    for (let i = 0; i < 3; i++) { t += 1000; vi.advanceTimersByTime(1000); }
    expect(total).toBe(3);
    // El navegador retrasa el siguiente tick 60 s: se suman 60, no 1.
    t += 60_000; vi.advanceTimersByTime(1000);
    expect(total).toBe(63);
    stop();
    t += 5000; vi.advanceTimersByTime(5000);
    expect(total).toBe(63);
  });
});
