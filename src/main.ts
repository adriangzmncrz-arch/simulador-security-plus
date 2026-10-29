import "./styles/tokens.css";
import "./styles/app.css";
import { BY } from "./data";
import { mulberry32, optionOrders, seedNow } from "./logic/builders";
import { grade } from "./logic/grading";
import { scaled } from "./logic/scoring";
import { startTicker } from "./logic/timer";
import { applyTheme, loadAttempts, loadSession, loadTheme, mergeAttempts, saveAttempts, saveSession } from "./storage";
import { examActions, onExamChange, onExamKey, renderExam, updTimer } from "./views/exam";
import { homeActions, renderHome } from "./views/home";
import { resultActions, renderResult } from "./views/result";
import type { Action, App, Attempt } from "./types";

const root = document.getElementById("app")!;
let stopTick: (() => void) | null = null;

function startTick(): void {
  stopTicking(); let k = 0;
  stopTick = startTicker(dt => {
    const S = app.S;
    if (!S || app.view !== "exam") return;
    S.elapsed += dt; k++; if (k % 5 === 0) app.persist();
    updTimer(app);
    if (S.limit && S.elapsed >= S.limit) app.finish(true);
  });
}
function stopTicking(): void { if (stopTick) { stopTick(); stopTick = null; } }

/** Selector estable del elemento enfocado, para devolverle el foco tras volver a renderizar. */
function focusKey(el: Element | null): string | null {
  if (!(el instanceof HTMLElement) || !root.contains(el)) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  const act = el.dataset.act; if (!act) return null;
  return `[data-act="${act}"]` + ["k", "i", "f", "id", "obj", "theme"]
    .filter(a => el.dataset[a] != null).map(a => `[data-${a}="${CSS.escape(el.dataset[a]!)}"]`).join("");
}

const app: App = {
  root,
  view: "home",
  attempts: loadAttempts(),
  S: loadSession(),
  sheet: null,
  confirmEnd: false,
  lastResult: null,
  reviewFilter: "bad",
  notice: null,
  theme: loadTheme(),

  render() {
    const key = focusKey(document.activeElement), hadSheet = !!root.querySelector(".sheet");
    if (app.view === "exam" && !app.S) app.view = "home";
    if (app.view === "result" && !app.lastResult) app.view = "home";
    if (app.view !== "exam") stopTicking();
    if (app.view === "home") renderHome(app);
    else if (app.view === "exam") renderExam(app);
    else renderResult(app);
    const el = key ? root.querySelector<HTMLElement>(key) : null;
    const box = root.querySelector<HTMLElement>(".sheet .box");
    if (box && !box.contains(el)) box.querySelector<HTMLElement>('[data-act="closesheet"]:not(.sheet)')?.focus({ preventScroll: true });
    else if (el) el.focus({ preventScroll: true });
    else if (hadSheet && !box) root.querySelector<HTMLElement>('.bar [data-act="nav"]')?.focus({ preventScroll: true });
  },
  persist() { if (app.S) saveSession(app.S); },
  startSession(cfg) {
    app.S = { label: cfg.label, mode: cfg.mode, qids: cfg.qids, ans: {}, flags: [], revealed: {}, idx: 0, elapsed: 0, limit: cfg.limit || 0, feedback: !!cfg.feedback, ts: Date.now(), order: optionOrders(cfg.qids, mulberry32(seedNow())) };
    app.persist(); app.confirmEnd = false; app.openExam();
  },
  openExam() { app.view = "exam"; app.render(); startTick(); window.scrollTo(0, 0); },
  finish(timeUp) {
    stopTicking();
    const S = app.S; if (!S) return;
    const res: Record<string, number> = {}; let sum = 0;
    S.qids.forEach(id => { const s = grade(BY[id], S.ans[id]); res[id] = Math.round(s * 1000) / 1000; sum += s; });
    const exam = S.mode === "exam" || S.mode === "diag";
    const a: Attempt = {
      id: "a_" + Date.now(), ts: Date.now(), label: S.label, mode: S.mode, n: S.qids.length, score: Math.round(sum * 1000) / 1000,
      scaled: exam ? scaled(sum / S.qids.length) : null, elapsed: S.limit ? Math.min(S.elapsed, S.limit) : S.elapsed,
      limit: S.limit, timeUp: !!timeUp, res, ans: S.ans, flags: S.flags, order: S.order,
    };
    app.lastResult = a; app.S = null; saveSession(null); app.sheet = null; app.confirmEnd = false; app.reviewFilter = "bad";
    app.setAttempts(mergeAttempts(app.attempts, [a]));
    app.view = "result"; app.render(); window.scrollTo(0, 0);
  },
  abandon() { stopTicking(); app.S = null; saveSession(null); app.sheet = null; app.view = "home"; app.render(); },
  pauseToHome() { stopTicking(); app.persist(); app.sheet = null; app.view = "home"; app.render(); window.scrollTo(0, 0); },
  goHome() { app.view = "home"; app.render(); window.scrollTo(0, 0); },
  openResult(a) { app.lastResult = a; app.reviewFilter = "bad"; app.view = "result"; app.render(); window.scrollTo(0, 0); },
  setAttempts(list) { app.attempts = list; saveAttempts(list); },
};

const ACTIONS: Record<string, Action> = { ...homeActions, ...examActions, ...resultActions };

document.addEventListener("click", e => {
  const t = (e.target as Element).closest<HTMLElement>("[data-act]"); if (!t) return;
  const act = t.dataset.act!;
  // Clic dentro de la hoja (no en el fondo): no la cierra.
  if (act === "closesheet" && t.classList.contains("sheet") && e.target !== t) return;
  ACTIONS[act]?.(app, t);
});
document.addEventListener("change", e => onExamChange(app, e));
document.addEventListener("keydown", e => onExamKey(app, e));
window.addEventListener("pagehide", () => app.persist());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") app.persist(); });

applyTheme(app.theme);
app.render();
