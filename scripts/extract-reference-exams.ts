/**
 * Regenera tests/fixtures/reference-exams.json abriendo el prototipo
 * (reference/simulador-referencia.html) en Chromium, iniciando los Exámenes 1–3
 * y leyendo la sesión que guarda en localStorage. Solo hace falta volver a
 * correrlo si cambia el prototipo.
 *
 * Uso: npx tsx scripts/extract-reference-exams.ts
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const url = pathToFileURL(resolve(root, "reference/simulador-referencia.html")).href;
const out: Record<string, string[]> = {};

const browser = await chromium.launch();
try {
  for (const k of [1, 2, 3]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(url);
    await page.click(`[data-act="fixed"][data-k="${k}"]`);
    const raw = await page.evaluate(() => localStorage.getItem("secplus701.current"));
    if (!raw) throw new Error(`El prototipo no guardó la sesión del Examen ${k}`);
    out[`exam${k}`] = JSON.parse(raw).qids;
    await ctx.close();
  }
} finally {
  await browser.close();
}

const file = resolve(root, "tests/fixtures/reference-exams.json");
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`Escrito ${file}: ${Object.entries(out).map(([k, v]) => `${k} ${v.length}`).join(", ")}`);
