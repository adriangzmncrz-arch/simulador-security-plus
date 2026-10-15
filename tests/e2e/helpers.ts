import { expect, type Page } from "@playwright/test";

const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

/** Junta los errores de consola y de página (ignora fallos de red de Google Fonts). */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", m => { if (m.type() === "error" && !FONT_HOSTS.test(m.location().url)) errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  return errors;
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw, `scrollWidth ${sw} > viewport ${w}`).toBeLessThanOrEqual(w);
}

/** Responde la pregunta visible: primera categoría en match, primeras N opciones en multi, A en single. */
export async function answerCurrent(page: Page): Promise<void> {
  const selects = page.locator(".mrow select");
  const n = await selects.count();
  if (n) { for (let j = 0; j < n; j++) await selects.nth(j).selectOption({ index: 1 }); return; }
  const multi = await page.locator("label.opt.multi").count();
  const need = multi ? Number((await page.locator(".hint").innerText()).match(/Selecciona (\d)/)![1]) : 1;
  for (let j = 0; j < need; j++) await page.locator("label.opt").nth(j).click();
}

/** Abre la hoja de revisión, pide entregar y confirma. */
export async function submitFromSheet(page: Page, fb = false): Promise<void> {
  await page.locator('.bar [data-act="nav"]').click();
  await page.locator('[data-act="askend"]').click();
  await expect(page.locator(".confirm")).toBeVisible();
  await page.locator('[data-act="finish"]').click();
  await expect(page.locator(".verdict")).toBeVisible();
  if (!fb) await expect(page.locator(".verdict .score small")).toHaveText("/900");
}
