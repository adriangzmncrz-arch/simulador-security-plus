import { BY, LETTERS, OBJ } from "../data";
import { answered, grade, toggleMulti } from "../logic/grading";
import { clock, fmtTime } from "../logic/timer";
import { pct } from "../ui/format";
import { esc, rich } from "../ui/rich";
import type { Action, App, Session } from "../types";

export function renderExam(app: App): void {
  const S = app.S!;
  const id = S.qids[S.idx], q = BY[id], v = S.ans[id], fb = S.feedback, rev = fb && S.revealed[id];
  const nAns = S.qids.filter(x => answered(BY[x], S.ans[x])).length;
  const isFlag = S.flags.includes(id);
  let h = `<div class="bar"><div class="in"><span class="ttl">${esc(S.label)}</span><span class="ctr">${S.idx + 1}/${S.qids.length}</span><span class="timer" id="timer"></span><button data-act="flag" class="${isFlag ? "on" : ""}" aria-pressed="${isFlag}">${isFlag ? "Marcada" : "Marcar"}</button><button data-act="nav">Preguntas</button><button data-act="pause">Salir</button></div><div class="progress"><i style="width:${nAns / S.qids.length * 100}%"></i></div></div>`;
  h += `<div class="qwrap"><div class="qhead"><span class="eyebrow">Pregunta ${S.idx + 1}</span>${q.type === "match" ? `<span class="chip acc">Tipo PBQ</span>` : ""}${q.type === "multi" ? `<span class="chip">Selección múltiple</span>` : ""}${fb ? `<span class="chip">${q.objective} · ${esc(OBJ[q.objective])}</span>` : ""}</div>`;
  h += `<div class="stem">${rich(q.stem)}</div>`;
  if (q.type === "match") {
    h += `<p class="hint">Asigna una categoría a cada elemento.</p><div class="match">`;
    q.items!.forEach((it, i) => {
      const cur = Array.isArray(v) ? v[i] : null; let cls = "";
      if (rev) cls = cur === q.answer[i] ? "right" : "wrong";
      h += `<div class="mrow ${cls}"><span class="it">${rich(it).replace(/^<p>|<\/p>$/g, "")}</span><select id="m_${id}_${i}" data-mi="${i}" ${rev ? "disabled" : ""} aria-label="Categoría para el elemento ${i + 1}"><option value="">— Selecciona —</option>${q.choices!.map((c, j) => `<option value="${j}" ${cur === j ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>${rev && cur !== q.answer[i] ? `<span class="fix">Correcto: ${esc(q.choices![q.answer[i]])}</span>` : ""}</div>`;
    });
    h += `</div>`;
  } else {
    const multi = q.type === "multi", need = q.answer.length;
    if (multi) h += `<p class="hint">Selecciona ${need}. Llevas ${Array.isArray(v) ? v.length : 0}.</p>`;
    h += `<div class="opts" role="${multi ? "group" : "radiogroup"}">`;
    q.options!.forEach((o, i) => {
      const sel = multi ? (Array.isArray(v) && v.includes(i)) : v === i;
      let cls = sel ? "sel" : "";
      if (rev) { const ok = q.answer.includes(i); cls = ok ? "right" : (sel ? "wrong" : ""); cls += " locked"; }
      h += `<label class="opt ${multi ? "multi" : ""} ${cls}"><input type="${multi ? "checkbox" : "radio"}" name="q_${id}" id="o_${id}_${i}" data-oi="${i}" ${sel ? "checked" : ""} ${rev ? "disabled" : ""}><span class="key">${LETTERS[i]}</span><span class="txt">${esc(o)}</span></label>`;
    });
    h += `</div>`;
  }
  if (rev) {
    const s = grade(q, v), cls = s === 1 ? "ok" : "bad";
    h += `<div class="explain ${cls}"><b>${s === 1 ? "Correcto." : s > 0 ? `Parcial: ${pct(s)} de los elementos.` : "Incorrecto."}</b><div>${rich(q.explanation)}</div></div>`;
  }
  h += `</div>`;
  const last = S.idx === S.qids.length - 1;
  let right;
  if (fb && !rev) right = `<button class="primary" data-act="check" ${answered(q, v) ? "" : "disabled"}>Comprobar</button>`;
  else if (last) right = `<button class="primary" data-act="nav">${fb ? "Terminar" : "Ir a revisión"}</button>`;
  else right = `<button class="primary" data-act="next">Siguiente →</button>`;
  h += `<div class="dock"><div class="in"><button data-act="prev" ${S.idx === 0 ? "disabled" : ""}>← Anterior</button><span class="kbd">A–F responder · ← → navegar · M marcar</span>${right}</div></div>`;
  if (app.sheet === "nav") h += navSheet(app, S);
  app.root.className = ""; app.root.innerHTML = h; updTimer(app);
}

function navSheet(app: App, S: Session): string {
  const fb = S.feedback;
  const nAns = S.qids.filter(x => answered(BY[x], S.ans[x])).length, nFlag = S.flags.length, nUn = S.qids.length - nAns;
  let h = `<div class="sheet" data-act="closesheet"><div class="box" role="dialog" aria-modal="true" aria-label="Revisión de preguntas"><div class="row" style="justify-content:space-between"><h2>${fb ? "Progreso" : "Revisión antes de entregar"}</h2><button class="ghost" data-act="closesheet">Cerrar</button></div>`;
  h += `<div class="legend"><span class="chip acc">${nAns} respondidas</span><span class="chip ${nUn ? "bad" : ""}">${nUn} sin responder</span><span class="chip flag">${nFlag} marcadas</span>${S.limit ? `<span class="chip">Quedan ${fmtTime(S.limit - S.elapsed)}</span>` : ""}</div>`;
  h += `<div class="navgrid">` + S.qids.map((id, i) => {
    const q = BY[id], a = answered(q, S.ans[id]); let c = a ? "ans" : "";
    if (fb && S.revealed[id]) { const s = grade(q, S.ans[id]); c = s === 1 ? "r-ok" : s > 0 ? "r-mid" : "r-bad"; }
    if (S.flags.includes(id)) c += " flg";
    if (i === S.idx) c += " cur";
    return `<button class="${c}" data-act="go" data-i="${i}" aria-label="Pregunta ${i + 1}${a ? ", respondida" : ""}${S.flags.includes(id) ? ", marcada" : ""}">${i + 1}</button>`;
  }).join("") + `</div>`;
  if (nFlag) h += `<div class="row"><button class="small" data-act="goflag">Ir a la primera marcada</button>${nUn ? `<button class="small" data-act="gounans">Ir a la primera sin responder</button>` : ""}</div>`;
  else if (nUn) h += `<div class="row"><button class="small" data-act="gounans">Ir a la primera sin responder</button></div>`;
  if (app.confirmEnd) {
    h += `<div class="confirm"><b>${fb ? "¿Terminar este bloque?" : "¿Entregar el examen?"}</b><span class="small">${nUn ? `Tienes ${nUn} sin responder; cuentan como incorrectas. ` : ""}${fb ? "Las que no comprobaste se califican igual." : "Ya no podrás cambiar respuestas."}</span><div class="row"><button class="danger" data-act="finish">${fb ? "Terminar" : "Entregar examen"}</button><button data-act="cancelend">Seguir revisando</button></div></div>`;
  } else {
    h += `<div class="row" style="justify-content:flex-end"><button class="primary" data-act="askend">${fb ? "Terminar bloque" : "Entregar examen"}</button></div>`;
  }
  h += `</div></div>`;
  return h;
}

/** Actualiza solo el reloj (se llama en cada tick sin volver a renderizar). */
export function updTimer(app: App): void {
  const t = app.root.querySelector<HTMLElement>("#timer"), S = app.S;
  if (!t || !S) return;
  const c = clock(S.elapsed, S.limit);
  t.textContent = c.text;
  if (S.limit) { t.className = "timer" + (c.cls ? " " + c.cls : ""); t.setAttribute("aria-label", "Tiempo restante " + c.text); }
}

function setAns(app: App, val: unknown): void { const S = app.S!; S.ans[S.qids[S.idx]] = val; app.persist(); }

function pickOption(app: App, i: number): void {
  const S = app.S!, id = S.qids[S.idx], q = BY[id];
  if (q.type === "match" || !q.options![i]) return;
  if (S.feedback && S.revealed[id]) return;
  if (q.type === "single") setAns(app, i);
  else setAns(app, toggleMulti(S.ans[id], i, q.answer.length));
  app.render();
  document.getElementById(`o_${id}_${i}`)?.focus({ preventScroll: true });
}

function go(app: App, i: number): void {
  const S = app.S!;
  S.idx = Math.max(0, Math.min(S.qids.length - 1, i)); app.persist();
  app.sheet = null; app.confirmEnd = false; app.render(); window.scrollTo(0, 0);
}

export const examActions: Record<string, Action> = {
  pause: app => app.pauseToHome(),
  flag: app => { const S = app.S!, id = S.qids[S.idx]; S.flags = S.flags.includes(id) ? S.flags.filter(x => x !== id) : S.flags.concat(id); app.persist(); app.render(); },
  nav: app => { app.sheet = "nav"; app.confirmEnd = false; app.render(); },
  closesheet: app => { app.sheet = null; app.confirmEnd = false; app.render(); },
  askend: app => { app.confirmEnd = true; app.render(); },
  cancelend: app => { app.confirmEnd = false; app.render(); },
  finish: app => app.finish(false),
  go: (app, t) => go(app, +t.dataset.i!),
  goflag: app => { const S = app.S!; go(app, S.qids.findIndex(id => S.flags.includes(id))); },
  gounans: app => { const S = app.S!; go(app, S.qids.findIndex(id => !answered(BY[id], S.ans[id]))); },
  next: app => go(app, app.S!.idx + 1),
  prev: app => go(app, app.S!.idx - 1),
  check: app => { const S = app.S!; S.revealed[S.qids[S.idx]] = true; app.persist(); app.render(); },
};

export function onExamChange(app: App, e: Event): void {
  const S = app.S;
  if (app.view !== "exam" || !S) return;
  const t = e.target as HTMLInputElement | HTMLSelectElement;
  if (t.dataset.oi != null) { pickOption(app, +t.dataset.oi); return; }
  if (t.dataset.mi != null) {
    const id = S.qids[S.idx], q = BY[id];
    const v: (number | null)[] = Array.isArray(S.ans[id]) ? [...S.ans[id] as (number | null)[]] : q.items!.map(() => null);
    v[+t.dataset.mi] = t.value === "" ? null : +t.value;
    setAns(app, v);
    if (S.feedback) app.render();
    else { const p = app.root.querySelector<HTMLElement>(".progress i"); if (p) p.style.width = (S.qids.filter(x => answered(BY[x], S.ans[x])).length / S.qids.length * 100) + "%"; }
  }
}

const FOCUSABLE = "button:not([disabled]),select:not([disabled]),input:not([disabled])";

export function onExamKey(app: App, e: KeyboardEvent): void {
  const S = app.S;
  if (app.view !== "exam" || !S || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement;
  if (target.tagName === "SELECT") return;
  if (app.sheet) {
    if (e.key === "Escape") { app.sheet = null; app.confirmEnd = false; app.render(); }
    else if (e.key === "Tab") trapFocus(app, e);
    return;
  }
  const k = e.key.toUpperCase();
  if (k.length === 1 && LETTERS.slice(0, 6).includes(k)) { pickOption(app, LETTERS.indexOf(k)); e.preventDefault(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); if (!(S.feedback && !S.revealed[S.qids[S.idx]]) && S.idx < S.qids.length - 1) go(app, S.idx + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); if (S.idx > 0) go(app, S.idx - 1); }
  else if (k === "M") { app.root.querySelector<HTMLElement>('[data-act="flag"]')?.click(); }
}

/** Mantiene el foco del teclado dentro de la hoja de revisión mientras está abierta. */
function trapFocus(app: App, e: KeyboardEvent): void {
  const box = app.root.querySelector<HTMLElement>(".sheet .box"); if (!box) return;
  const els = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)]; if (!els.length) return;
  const first = els[0], last = els[els.length - 1], active = document.activeElement as HTMLElement | null;
  if (!active || !box.contains(active)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}
