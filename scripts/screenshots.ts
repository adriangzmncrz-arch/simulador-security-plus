/**
 * Genera las capturas del README (docs/screenshots/) a partir del sitio construido.
 * Crea un historial verosímil respondiendo con la clave del banco y una tasa de
 * acierto fija por intento, con fechas y reloj simulados para que sea reproducible.
 *
 * Uso: npm run screenshots   (hace build antes)
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preview } from "vite";
import { BY, LETTERS } from "../src/data";
import { mulberry32 } from "../src/logic/builders";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const out = resolve(root, "docs/screenshots");
mkdirSync(out, { recursive: true });

const DAY = 86_400_000;
const T0 = new Date("2026-09-14T18:30:00").getTime();
const VIEW = { width: 1100, height: 860 };

/** Responde la pregunta visible; acierta con probabilidad p. */
async function answer(page: Page, p: number, rnd: () => number) {
  const el = page.locator('.qwrap [id^="o_"], .qwrap [id^="m_"]').first();
  const id = (await el.getAttribute("id"))!.split("_")[1], q = BY[id], ok = rnd() < p;
  if (q.type === "match") {
    const bad = ok ? -1 : Math.floor(rnd() * q.items!.length);
    for (let i = 0; i < q.items!.length; i++) {
      const v = i === bad ? (q.answer[i] + 1) % q.choices!.length : q.answer[i];
      await page.locator(`#m_${id}_${i}`).selectOption(String(v));
    }
    return;
  }
  const n = q.options!.length;
  const keys = ok ? q.answer : [q.answer[0], ...Array.from({ length: n }, (_, i) => i).filter(i => !q.answer.includes(i))].slice(0, q.answer.length);
  if (q.type === "single" && !ok) keys[0] = (q.answer[0] + 1) % n;
  for (const k of keys) await page.keyboard.press(LETTERS[k]);
}

async function block(page: Page, start: string, p: number, seed: number, secs: number, feedback = false) {
  const rnd = mulberry32(seed);
  await page.locator(start).click();
  const total = Number((await page.locator(".bar .ctr").innerText()).split("/")[1]);
  for (let i = 0; i < total; i++) {
    await answer(page, p, rnd);
    if (feedback) await page.locator('[data-act="check"]').click();
    await page.clock.runFor(secs * 1000);
    if (i < total - 1) await page.locator('[data-act="next"]').click();
  }
  await page.locator('.bar [data-act="nav"]').click();
  await page.locator('[data-act="askend"]').click();
  await page.locator('[data-act="finish"]').click();
  await page.locator('[data-act="home"]').first().click();
}

const server = await preview({ root, preview: { port: 4174, strictPort: true } });
const url = server.resolvedUrls!.local[0];
const browser = await chromium.launch();
try {
  // 1) Historial: dos simulacros, un diagnóstico y una práctica.
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  await page.clock.install({ time: T0 });
  await page.goto(url);
  await block(page, '[data-act="diag"]', .6, 1, 50);
  await page.clock.setSystemTime(T0 + 4 * DAY);
  await block(page, '[data-act="fixed"][data-k="1"]', .72, 2, 35);
  await page.clock.setSystemTime(T0 + 9 * DAY);
  await page.selectOption("#pdom", "4"); await page.selectOption("#pobj", "4.3"); await page.selectOption("#pn", "10");
  await block(page, '[data-act="practice"]', .7, 3, 60, true);
  await page.clock.setSystemTime(T0 + 15 * DAY);
  await block(page, '[data-act="fixed"][data-k="2"]', .82, 4, 40);
  const state = await ctx.storageState();
  await ctx.close();

  // 2) Capturas en claro y oscuro con el mismo historial.
  for (const [scheme, name] of [["light", "claro"], ["dark", "oscuro"]] as const) {
    const c = await browser.newContext({ viewport: VIEW, colorScheme: scheme, storageState: state });
    const pg = await c.newPage();
    await pg.clock.install({ time: T0 + 16 * DAY });
    await pg.goto(url);
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: `${out}/inicio-${name}.png` });

    await pg.locator('[data-act="open"]').first().click();
    await pg.mouse.move(0, 0);
    await pg.screenshot({ path: `${out}/resultado-${name}.png` });

    await pg.locator('[data-act="home"]').first().click();
    await pg.locator('[data-act="fixed"][data-k="3"]').click();
    while (!(await pg.locator(".stem pre").count() && await pg.locator("label.opt").count())) await pg.locator('[data-act="next"]').click();
    await pg.keyboard.press("B");
    await pg.keyboard.press("M");
    await pg.clock.runFor(14 * 60_000 + 23_000);
    await pg.mouse.move(0, 0);
    await pg.screenshot({ path: `${out}/examen-${name}.png` });
    await c.close();
  }
  console.log(`Capturas en ${out}`);
} finally {
  await browser.close();
  await server.close();
}
