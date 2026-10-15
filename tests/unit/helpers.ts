import type { Attempt, Question } from "../../src/types";

export const single: Question = {
  id: "D1-901", domain: 1, objective: "1.1", type: "single", difficulty: 1,
  stem: "s", options: ["a", "b", "c", "d"], answer: [2], explanation: "e",
};
export const multi: Question = {
  id: "D2-901", domain: 2, objective: "2.1", type: "multi", difficulty: 1,
  stem: "s (Elige DOS.)", options: ["a", "b", "c", "d", "e"], answer: [1, 3], explanation: "e",
};
export const match: Question = {
  id: "D3-901", domain: 3, objective: "3.1", type: "match", difficulty: 1,
  stem: "s", items: ["i0", "i1", "i2", "i3"], choices: ["x", "y", "z"], answer: [0, 2, 1, 2], explanation: "e",
};

export function attempt(res: Record<string, number>, over: Partial<Attempt> = {}): Attempt {
  const ids = Object.keys(res), score = ids.reduce((s, id) => s + res[id], 0);
  return {
    id: "a_" + Math.random().toString(36).slice(2), ts: Date.now(), label: "Práctica", mode: "practice",
    n: ids.length, score, scaled: null, elapsed: 60, limit: 0, timeUp: false, res, ans: {}, flags: [], ...over,
  };
}
