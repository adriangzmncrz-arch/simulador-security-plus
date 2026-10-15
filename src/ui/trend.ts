import { PASS } from "../logic/scoring";
import type { Attempt } from "../types";

/** Tendencia de puntajes escalados: SVG 440×120 con ejes en 100/500/750/900 (750 punteada). */
export function trendSvg(atts: Attempt[]): string {
  const W = 440, H = 120, pl = 34, pr = 10, pt = 10, pb = 20, n = atts.length;
  const x = (i: number) => pl + (n === 1 ? 0 : i * (W - pl - pr) / (n - 1)), y = (v: number) => pt + (900 - v) / (900 - 100) * (H - pt - pb);
  const pts = atts.map((a, i) => [x(i), y(a.scaled!)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${pts[n - 1][0].toFixed(1)} ${H - pb} L ${pts[0][0].toFixed(1)} ${H - pb} Z`;
  const lp = pts[n - 1], lv = atts[n - 1].scaled;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tendencia de puntajes en simulacros" style="max-width:100%;display:block">
  ${[100, 500, 750, 900].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1" ${v === 750 ? 'stroke-dasharray="4 3" style="stroke:var(--ink-3)"' : ""}/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" font-family="IBM Plex Mono,monospace" fill="var(--ink-3)">${v}</text>`).join("")}
  <path d="${area}" fill="var(--accent-soft)"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>
  ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === n - 1 ? 4.5 : 2.5}" fill="${atts[i].scaled! >= PASS ? "var(--ok)" : "var(--bad)"}"/>`).join("")}
  <text x="${Math.min(lp[0], W - pr - 4)}" y="${lp[1] - 9}" text-anchor="end" font-size="11" font-weight="600" font-family="IBM Plex Mono,monospace" fill="var(--ink)">${lv}</text></svg>`;
}
