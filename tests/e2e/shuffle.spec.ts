import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

type Q = { id: string; type: string; options?: string[]; answer: number[] };
const d1: Q[] = JSON.parse(readFileSync(new URL("../../data/questions/domain-1.json", import.meta.url), "utf8"));
const BY = Object.fromEntries(d1.map(q => [q.id, q]));

test("práctica con opciones barajadas: se muestran en el orden de la sesión y se califican por contenido", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("./");
  await page.selectOption("#pdom", "1");
  await page.selectOption("#pobj", "1.4");
  await page.selectOption("#pn", "10");
  await page.getByRole("button", { name: "Practicar", exact: true }).click();

  let moved = 0;
  for (let n = 0; n < 10; n++) {
    await expect(page.locator(".bar .ctr")).toHaveText(`${n + 1}/10`);
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem("secplus701.current")!));
    const id: string = s.qids[s.idx], q = BY[id];
    if (q.options) {
      const order: number[] = s.order[id];
      expect([...order].sort()).toEqual(q.options.map((_, i) => i));
      await expect(page.locator("label.opt .txt")).toHaveText(order.map(i => q.options![i]));
      if (order.some((x, p) => x !== p)) moved++;
      // Elegir las correctas por su texto, sin importar en qué letra quedaron.
      for (const a of q.answer) await page.locator("label.opt", { has: page.locator(".txt", { hasText: q.options[a] }) }).click();
      await page.getByRole("button", { name: "Comprobar" }).click();
      await expect(page.locator(".explain b")).toHaveText("Correcto.");
    } else {
      const selects = page.locator(".mrow select");
      for (let j = 0; j < await selects.count(); j++) await selects.nth(j).selectOption({ index: 1 });
      await page.getByRole("button", { name: "Comprobar" }).click();
    }
    if (n < 9) await page.getByRole("button", { name: "Siguiente →" }).click();
  }
  expect(moved).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
