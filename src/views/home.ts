import { BANK, BY, DOM, DOMAINS, OBJ } from "../data";
import { QUOTA30, QUOTA90, fixedExam, missedSet, practiceSet, weightedExam } from "../logic/builders";
import { answered } from "../logic/grading";
import { PASS, aggregate, band, barClass, latestResults, readiness, readinessChip, scaled } from "../logic/scoring";
import { fmtTime } from "../logic/timer";
import { fmtDate, pct } from "../ui/format";
import { esc } from "../ui/rich";
import { trendSvg } from "../ui/trend";
import type { Action, App } from "../types";

export function renderHome(app: App): void {
  const { attempts, S } = app;
  const { last, seen } = latestResults(attempts), ag = aggregate(last), rd = readiness(ag.d);
  const examAtts = attempts.filter(a => a.scaled != null);
  const doneFixed = (k: number) => attempts.filter(a => a.label === "Examen " + k).length;
  const totalSeen = Object.keys(seen).length;
  const weakList = Object.entries(ag.o).filter(([, v]) => v.n >= 2).map(([k, v]) => ({ k, r: v.c / v.n, n: v.n })).sort((a, b) => a.r - b.r || b.n - a.n).slice(0, 6).filter(x => x.r < .9);
  const untested = Object.keys(OBJ).filter(k => !ag.o[k]);
  let h = "";
  h += `<header class="masthead"><div class="stack" style="gap:6px"><span class="eyebrow">CompTIA Security+ · práctica personal</span><h1>Simulador Security+</h1></div><div class="code">SY0-701 · ${BANK.length} preguntas · 5 dominios</div></header>`;
  if (S) {
    h += `<div class="resume"><div class="stack" style="gap:2px"><b>Tienes un ${S.mode === "practice" || S.mode === "missed" ? "bloque de práctica" : "examen"} en curso: ${esc(S.label)}</b><span class="small muted">Pregunta ${S.idx + 1} de ${S.qids.length} · ${Object.keys(S.ans).filter(id => BY[id] && answered(BY[id], S.ans[id])).length} respondidas · ${S.limit ? "quedan " + fmtTime(S.limit - S.elapsed) : "tiempo " + fmtTime(S.elapsed)}</span></div><div class="row"><button class="primary" data-act="resume">Continuar</button><button class="ghost" data-act="discard">Descartar</button></div></div>`;
  }
  // readiness
  h += `<section class="panel" style="margin-bottom:22px"><div class="readiness"><div class="gauge">`;
  if (rd) {
    const sc = scaled(rd.r), [cl, cc] = readinessChip(sc);
    h += `<span class="eyebrow">Puntaje proyectado</span><span class="big">${sc}</span><span class="small muted">de 900 · aprobar = ${PASS}</span><div class="scale" role="img" aria-label="Proyección ${sc} de 900"><span class="pass"></span><span class="mk" style="left:${Math.min(100, Math.max(0, rd.r * 100))}%"></span></div><div class="ticks"><span>100</span><span>750</span><span>900</span></div>`;
    h += `<span class="chip ${cc}" style="align-self:flex-start;margin-top:8px">${cl}</span>`;
  } else {
    h += `<span class="eyebrow">Puntaje proyectado</span><span class="big" style="color:var(--ink-3)">—</span><span class="small muted">Haz el diagnóstico o un simulacro para calcularlo.</span>`;
  }
  h += `</div><div class="dbars">`;
  for (const k of DOMAINS) {
    const x = ag.d[k], r = x ? x.c / x.n : 0, n = x ? x.n : 0, [bl, bc] = band(r, n);
    h += `<div class="dbar"><div class="lab"><b>${k}.0</b><span>${DOM[k].n}</span> <span class="small muted mono">· ${Math.round(DOM[k].w * 100)}%</span><div class="track"><i class="${barClass(r, n)}" style="width:${n ? r * 100 : 0}%"></i><span class="tgt"></span></div></div><span class="pct">${n ? pct(r) : "—"}</span><span class="chip ${bc}">${bl}</span></div>`;
  }
  h += `<p class="small muted">Precisión según tu último intento de cada pregunta (${totalSeen} de ${BANK.length} vistas). La línea punteada marca ~81%, lo que equivale a 750 en esta escala.</p></div></div></section>`;

  // modes
  h += `<section style="margin-bottom:26px"><h2>Elige cómo practicar</h2><div class="modes">`;
  h += `<div class="mode hero"><span class="eyebrow">Simulacro completo</span><h3>Examen de 90 preguntas · 90 minutos</h3><p class="small muted">Como el real: sin retroalimentación hasta el final, preguntas tipo PBQ al inicio, marcar para revisión y pantalla de revisión antes de entregar.</p><div class="examset">`;
  for (let k = 1; k <= 3; k++) { const n = doneFixed(k); h += `<button class="${k === 1 && !n ? "primary" : ""}" data-act="fixed" data-k="${k}">Examen ${k}<small>${n ? n + " intento" + (n > 1 ? "s" : "") : "sin intentar"}</small></button>`; }
  h += `<button data-act="randexam">Aleatorio<small>prioriza no vistas</small></button></div></div>`;
  h += `<div class="mode"><span class="eyebrow">Diagnóstico rápido</span><h3>30 preguntas · 35 minutos</h3><p class="small muted">Muestra ponderada por dominio para estimar tu nivel en una sola sentada.</p><div class="actions"><button class="${attempts.length ? "" : "primary"}" data-act="diag">Empezar diagnóstico</button></div></div>`;
  h += `<div class="mode"><span class="eyebrow">Práctica dirigida</span><h3>Por dominio u objetivo, con explicación inmediata</h3><div class="grid2" style="gap:10px"><div class="field"><label for="pdom">Dominio</label><select id="pdom"><option value="all">Todos</option>${DOMAINS.map(k => `<option value="${k}">${k}.0 ${DOM[k].n}</option>`).join("")}</select></div><div class="field"><label for="pobj">Objetivo</label><select id="pobj"><option value="all">Todos</option></select></div></div><div class="row"><div class="field" style="width:110px"><label for="pn">Preguntas</label><select id="pn"><option>10</option><option selected>20</option><option>30</option><option value="999">Todas</option></select></div><label class="small" style="display:flex;gap:6px;align-items:center;margin-top:18px"><input type="checkbox" id="ptimed"> 1 min por pregunta</label></div><div class="actions"><button data-act="practice">Practicar</button></div></div>`;
  const miss = missedSet({ last, seen }).length;
  h += `<div class="mode"><span class="eyebrow">Repaso de errores</span><h3>Las que fallaste en tu último intento</h3><p class="small muted">${miss ? miss + " preguntas pendientes de corregir. Cuando aciertes una, sale de esta lista." : "Todavía no hay preguntas falladas. Aparecerán aquí después de tu primer intento."}</p><div class="actions"><button data-act="missed" ${miss ? "" : "disabled"}>Repasar ${miss || ""}</button></div></div>`;
  h += `</div></section>`;

  // weak areas
  h += `<div class="grid2" style="margin-bottom:26px"><section class="panel"><h2>Qué estudiar primero</h2>`;
  if (weakList.length) {
    h += `<div class="weak">` + weakList.map(w => { const [bl] = band(w.r, w.n); return `<div class="w"><span class="obj">${w.k}</span><span class="nm">${OBJ[w.k]}<small>${pct(w.r)} de ${w.n} · ${bl}</small></span><button class="small" data-act="drill" data-obj="${w.k}">Practicar</button></div>`; }).join("") + `</div>`;
  } else {
    h += `<p class="empty">Cuando tengas resultados, aquí aparecerán los objetivos del temario con menor precisión, con un botón para practicar cada uno.</p>`;
  }
  if (untested.length && attempts.length) h += `<p class="small muted">Sin evaluar aún: ${untested.map(k => `<span class="mono">${k}</span>`).join(", ")}.</p>`;
  h += `</section><section class="panel"><h2>Historial</h2>`;
  if (examAtts.length >= 2) h += trendSvg(examAtts.slice(-12));
  if (attempts.length) {
    h += `<div class="scroll-x"><table class="hist"><thead><tr><th>Fecha</th><th>Intento</th><th style="text-align:right">Resultado</th><th></th></tr></thead><tbody>` +
      attempts.slice().reverse().slice(0, 12).map(a => `<tr><td class="small">${fmtDate(a.ts)}</td><td>${esc(a.label)}</td><td style="text-align:right" class="mono">${a.scaled != null ? `<b>${a.scaled}</b>` : pct(a.n ? a.score / a.n : 0)}</td><td><button class="ghost small" data-act="open" data-id="${esc(a.id)}">Ver</button></td></tr>`).join("") + `</tbody></table></div>`;
  } else h += `<p class="empty">Sin intentos todavía. Te sugiero empezar por el diagnóstico de 30 preguntas.</p>`;
  h += `<p class="small muted">Tu historial se guarda en este navegador.</p></section></div>`;

  h += `<footer class="stack" style="gap:8px"><span>Preguntas originales escritas para el temario oficial SY0-701 (no son preguntas del examen real). El puntaje escalado es una estimación lineal: CompTIA no publica su fórmula.</span><span>Atajos durante el examen: A–F responder · ← → navegar · M marcar.</span>${attempts.length ? `<span><button class="ghost small" data-act="wipe">Borrar historial</button></span>` : ""}</footer>`;
  app.root.className = "wrap"; app.root.innerHTML = h;
  const pdom = app.root.querySelector<HTMLSelectElement>("#pdom")!, pobj = app.root.querySelector<HTMLSelectElement>("#pobj")!;
  const fillObj = () => { const d = pdom.value; pobj.innerHTML = `<option value="all">Todos</option>` + Object.keys(OBJ).filter(k => d === "all" || k[0] === d).map(k => `<option value="${k}">${k} ${OBJ[k]}</option>`).join(""); };
  pdom.onchange = fillObj; fillObj();
}

const val = (app: App, sel: string) => app.root.querySelector<HTMLSelectElement | HTMLInputElement>(sel)!;

export const homeActions: Record<string, Action> = {
  fixed: (app, t) => { const k = +t.dataset.k!; app.startSession({ label: "Examen " + k, mode: "exam", qids: fixedExam(k), limit: 90 * 60 }); },
  randexam: app => app.startSession({ label: "Examen aleatorio", mode: "exam", qids: weightedExam(QUOTA90, latestResults(app.attempts)), limit: 90 * 60 }),
  diag: app => app.startSession({ label: "Diagnóstico", mode: "diag", qids: weightedExam(QUOTA30, latestResults(app.attempts)), limit: 35 * 60 }),
  practice: app => {
    const d = val(app, "#pdom").value, o = val(app, "#pobj").value, n = +val(app, "#pn").value, timed = (val(app, "#ptimed") as HTMLInputElement).checked;
    const ids = practiceSet(d, o, n, latestResults(app.attempts)); if (!ids.length) return;
    const lab = o !== "all" ? `Práctica ${o}` : d !== "all" ? `Práctica dominio ${d}.0` : "Práctica general";
    app.startSession({ label: lab, mode: "practice", qids: ids, feedback: true, limit: timed ? ids.length * 60 : 0 });
  },
  drill: (app, t) => { const o = t.dataset.obj!; const ids = practiceSet("all", o, 20, latestResults(app.attempts)); app.startSession({ label: `Práctica ${o}`, mode: "practice", qids: ids, feedback: true }); },
  missed: app => { const ids = missedSet(latestResults(app.attempts)); if (ids.length) app.startSession({ label: "Repaso de errores", mode: "missed", qids: ids, feedback: true }); },
  resume: app => app.openExam(),
  discard: app => app.abandon(),
  open: (app, t) => { const a = app.attempts.find(x => x.id === t.dataset.id); if (a) app.openResult(a); },
  wipe: (app, t) => {
    t.outerHTML = `<span class="row"><span>¿Borrar todos los intentos? No se puede deshacer.</span><button class="danger small" data-act="wipeyes">Borrar</button><button class="small" data-act="wipeno">Cancelar</button></span>`;
    app.root.querySelector<HTMLElement>('[data-act="wipeno"]')?.focus();
  },
  wipeyes: app => { app.setAttempts([]); app.render(); },
  wipeno: app => { app.render(); app.root.querySelector<HTMLElement>('[data-act="wipe"]')?.focus(); },
};
