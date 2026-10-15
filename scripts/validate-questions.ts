/**
 * Valida el banco de preguntas (data/questions/domain-*.json) contra
 * schema/question.schema.json y las reglas de DESIGN.md §3.1.
 * Termina con código 1 si encuentra cualquier error.
 *
 * Uso: npm run validate [-- <carpeta>]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { OBJ } from "../src/data";

type Q = {
  id: string; domain: number; objective: string; type: string; stem: string;
  options?: string[]; items?: string[]; choices?: string[]; answer: number[];
};

const root = resolve(fileURLToPath(import.meta.url), "../..");
const dir = resolve(process.argv[2] ?? join(root, "data/questions"));
const schema = JSON.parse(readFileSync(join(root, "schema/question.schema.json"), "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);

const errors: string[] = [];
const seen = new Map<string, string>();
const count = { total: 0, single: 0, multi: 0, match: 0 } as Record<string, number>;
const perDomain: Record<number, number> = {};

const files = readdirSync(dir).filter(f => /^domain-[1-5]\.json$/.test(f)).sort();
if (files.length !== 5) errors.push(`Se esperaban domain-1.json … domain-5.json en ${dir}; hay ${files.length}.`);

for (const file of files) {
  const fileDomain = Number(file.match(/domain-(\d)/)![1]);
  let list: unknown;
  try { list = JSON.parse(readFileSync(join(dir, file), "utf8")); }
  catch (e) { errors.push(`${file}: JSON inválido (${(e as Error).message})`); continue; }
  if (!Array.isArray(list)) { errors.push(`${file}: debe ser un arreglo de preguntas`); continue; }

  list.forEach((raw, i) => {
    const where = `${file}[${i}]${raw && typeof raw === "object" && "id" in raw ? ` ${String((raw as Q).id)}` : ""}`;
    const err = (msg: string) => errors.push(`${where}: ${msg}`);
    if (!validate(raw)) {
      for (const e of validate.errors ?? []) {
        if (e.keyword === "if") continue; // ya se reporta el error concreto del "then"
        if (e.keyword === "not") err("esquema: campos que no corresponden al tipo (single/multi no llevan items/choices; match no lleva options)");
        else err(`esquema: ${e.instancePath || "/"} ${e.message}`);
      }
      return;
    }
    const q = raw as Q;
    count.total++; count[q.type]++;
    perDomain[q.domain] = (perDomain[q.domain] ?? 0) + 1;

    if (seen.has(q.id)) err(`ID duplicado (también en ${seen.get(q.id)})`);
    else seen.set(q.id, file);
    if (Number(q.id[1]) !== q.domain) err(`domain ${q.domain} no coincide con el prefijo del ID`);
    if (Number(q.objective[0]) !== q.domain) err(`objective ${q.objective} no empieza con el dígito del dominio ${q.domain}`);
    if (q.domain !== fileDomain) err(`está en ${file} pero es del dominio ${q.domain}`);
    if (!(q.objective in OBJ)) err(`objective ${q.objective} no existe en el catálogo OBJ`);

    if (q.type === "single" || q.type === "multi") {
      const n = q.options!.length;
      q.answer.forEach(a => { if (a >= n) err(`índice de respuesta ${a} fuera de rango (hay ${n} opciones)`); });
    }
    if (q.type === "multi") {
      const suffix = q.answer.length === 2 ? "(Elige DOS.)" : "(Elige TRES.)";
      if (!q.stem.trimEnd().endsWith(suffix)) err(`multi con ${q.answer.length} respuestas: el stem debe terminar en "${suffix}"`);
    }
    if (q.type === "match") {
      const nc = q.choices!.length;
      if (q.answer.length !== q.items!.length) err(`answer tiene ${q.answer.length} elementos y items ${q.items!.length}`);
      q.answer.forEach((a, j) => { if (a >= nc) err(`item ${j}: categoría ${a} fuera de rango (hay ${nc})`); });
    }
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} error(es) en el banco de preguntas:\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

const dom = Object.entries(perDomain).map(([d, n]) => `D${d} ${n}`).join(" · ");
console.log(`✓ ${count.total} preguntas válidas (${dom})`);
console.log(`  single ${count.single} · multi ${count.multi} · match ${count.match}`);
