import { BY, DOM, DOMAINS, LETTERS, OBJ } from "../data";
import { answered } from "../logic/grading";
import { PASS, TARGET, aggregate, band, barClass, neededForPass } from "../logic/scoring";
import { fmtTime } from "../logic/timer";
import { fmtDate, pct } from "../ui/format";
import { esc, rich } from "../ui/rich";
import type { Action, App, Attempt, ReviewFilter } from "../types";

export function renderResult(app: App): void {
  const a = app.lastResult!, reviewFilter = app.reviewFilter;
  const ag = aggregate(a.res), r = a.n ? a.score / a.n : 0, isExam = a.scaled != null, passed = isExam && a.scaled! >= PASS;
  let h = `<div class="row" style="justify-content:space-between;margin-bottom:18px"><button class="ghost" data-act="home">← Inicio</button><span class="small muted">${fmtDate(a.ts)}</span></div>`;
  h += `<section class="verdict" style="margin-bottom:22px"><div class="score">${isExam ? a.scaled : pct(r)}${isExam ? `<small> /900</small>` : ""}</div><div class="stack" style="gap:8px"><span class="eyebrow">${esc(a.label)}</span>${isExam ? `<span class="chip ${passed ? "ok" : "bad"}" style="align-self:flex-start;font-size:.85rem">${passed ? "Aprobado (estimado)" : "No aprobado (estimado)"}</span>` : ""}<div class="stats"><span>Aciertos <b>${(Math.round(a.score * 10) / 10)} de ${a.n}</b> (${pct(r)})</span><span>Tiempo <b>${fmtTime(a.elapsed)}</b>${a.limit ? ` de ${fmtTime(a.limit)}` : ""}</span>${a.timeUp ? `<span class="chip bad">Se acabó el tiempo</span>` : ""}</div>${isExam ? `<span class="small muted">Para 750 necesitas alrededor de ${neededForPass(a.n)} aciertos de ${a.n}.</span>` : ""}</div></section>`;
  h += `<div class="grid2" style="margin-bottom:22px"><section class="panel"><h2>Por dominio</h2><div class="dbars">`;
  for (const k of DOMAINS) {
    const x = ag.d[k]; if (!x) continue;
    const rr = x.c / x.n, [bl, bc] = band(rr, x.n);
    h += `<div class="dbar"><div class="lab"><b>${k}.0</b><span>${DOM[k].n}</span><div class="track"><i class="${barClass(rr, x.n)}" style="width:${rr * 100}%"></i><span class="tgt"></span></div></div><span class="pct">${pct(rr)}</span><span class="chip ${bc}">${bl}</span></div>`;
  }
  const ws = DOMAINS.filter(k => ag.d[k] && ag.d[k]!.c / ag.d[k]!.n < TARGET).sort((x, y) => ag.d[x]!.c / ag.d[x]!.n - ag.d[y]!.c / ag.d[y]!.n);
  h += `</div><p class="small muted">${ws.length ? `Por debajo del objetivo: ${ws.map(k => DOM[k].n).join(", ")}. El dominio 4 pesa 28% del examen, así que cada punto ahí cuenta más.` : "Todos los dominios por encima de ~81% en este intento."}</p></section>`;
  const objs = Object.entries(ag.o).map(([k, v]) => ({ k, r: v.c / v.n, n: v.n, c: v.c })).sort((x, y) => x.r - y.r || y.n - x.n);
  h += `<section class="panel"><h2>Por objetivo del temario</h2><div class="scroll-x"><table class="objt"><thead><tr><th>Obj.</th><th>Tema</th><th style="text-align:right">Aciertos</th><th></th></tr></thead><tbody>` +
    objs.map(o => `<tr><td class="mono">${o.k}</td><td class="small">${OBJ[o.k]}</td><td class="n">${Math.round(o.c * 10) / 10}/${o.n}</td><td><span class="mini"><i style="width:${o.r * 100}%;background:var(--${o.r >= .85 ? "ok" : o.r >= TARGET ? "mid" : "bad"})"></i></span></td></tr>`).join("") + `</tbody></table></div>`;
  const wk = objs.filter(o => o.r < TARGET).slice(0, 3);
  if (wk.length) h += `<div class="row">${wk.map(o => `<button class="small" data-act="drill" data-obj="${o.k}">Practicar ${o.k}</button>`).join("")}</div>`;
  h += `</section></div>`;
  // review — solo las preguntas que siguen existiendo en el banco
  const flags = a.flags || [];
  const list = a.n ? Object.keys(a.res).filter(id => BY[id]) : [];
  const cnt: Record<ReviewFilter, number> = { bad: list.filter(id => a.res[id] < 1).length, flag: list.filter(id => flags.includes(id)).length, all: list.length };
  h += `<section><div class="row" style="justify-content:space-between"><h2>Revisión con explicaciones</h2><div class="tabs">${([["bad", "Incorrectas"], ["flag", "Marcadas"], ["all", "Todas"]] as const).map(([k, l]) => `<button class="small ${reviewFilter === k ? "on" : ""}" data-act="rf" data-f="${k}" aria-pressed="${reviewFilter === k}">${l} (${cnt[k]})</button>`).join("")}</div></div>`;
  const shown = list.filter(id => reviewFilter === "all" || (reviewFilter === "bad" ? a.res[id] < 1 : flags.includes(id)));
  if (!shown.length) h += `<p class="empty">${reviewFilter === "bad" ? "Sin errores en este intento." : "No hay preguntas en este filtro."}</p>`;
  h += shown.map(id => reviewCard(id, a, list)).join("");
  h += `</section><div class="row" style="margin-top:26px"><button class="primary" data-act="home">Volver al inicio</button>${cnt.bad ? `<button data-act="missed">Repasar errores</button>` : ""}</div>`;
  app.root.className = "wrap"; app.root.innerHTML = h;
}

function reviewCard(id: string, a: Attempt, list: string[]): string {
  const q = BY[id]; if (!q) return "";
  const v = (a.ans || {})[id], s = a.res[id], n = list.indexOf(id) + 1;
  let h = `<article class="rv"><div class="qhead"><span class="eyebrow">#${n}</span><span class="chip ${s === 1 ? "ok" : s > 0 ? "mid" : "bad"}">${s === 1 ? "Correcta" : s > 0 ? "Parcial" : answered(q, v) ? "Incorrecta" : "Sin responder"}</span><span class="chip">${q.objective} · ${esc(OBJ[q.objective])}</span>${(a.flags || []).includes(id) ? `<span class="chip flag">Marcada</span>` : ""}</div><div class="stem">${rich(q.stem)}</div>`;
  if (q.type === "match") {
    h += `<div class="match">` + q.items!.map((it, i) => {
      const cur = Array.isArray(v) ? v[i] : null, ok = cur === q.answer[i];
      return `<div class="mrow ${ok ? "right" : "wrong"}"><span class="it">${esc(it)}</span><span class="small"><b>${esc(q.choices![q.answer[i]])}</b>${ok ? "" : `<br><span class="muted">Tu respuesta: ${cur == null || q.choices![cur] == null ? "—" : esc(q.choices![cur])}</span>`}</span></div>`;
    }).join("") + `</div>`;
  } else {
    const sel: number[] = q.type === "multi" ? (Array.isArray(v) ? v : []) : (typeof v === "number" ? [v] : []);
    h += `<div class="opts">` + q.options!.map((o, i) => {
      const ok = q.answer.includes(i), me = sel.includes(i);
      return `<label class="opt locked ${q.type === "multi" ? "multi" : ""} ${ok ? "right" : me ? "wrong" : ""}"><span class="key">${LETTERS[i]}</span><span class="txt">${esc(o)}${me ? ` <span class="small muted">· tu respuesta</span>` : ""}</span></label>`;
    }).join("") + `</div>`;
  }
  h += `<div class="explain ${s === 1 ? "ok" : "bad"}">${rich(q.explanation)}</div></article>`;
  return h;
}

export const resultActions: Record<string, Action> = {
  home: app => app.goHome(),
  rf: (app, t) => { app.reviewFilter = t.dataset.f as ReviewFilter; app.render(); },
};
