import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

const active = (page: import("@playwright/test").Page) =>
  page.evaluate(() => { const el = document.activeElement as HTMLElement; return { act: el?.dataset.act ?? null, text: el?.textContent?.trim() ?? "", outline: getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth }; });

test("examen completo con teclado: responder, navegar, marcar y usar la hoja con foco visible", async ({ page }) => {
  await page.goto("./");
  // Tab hasta "Examen 1" y abrirlo con Enter.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    if ((await active(page)).act === "fixed") break;
  }
  const f = await active(page);
  expect(f.act).toBe("fixed");
  expect(f.outline).toBe("solid 3px");
  await page.keyboard.press("Enter");
  await expect(page.locator(".bar .ctr")).toHaveText("1/90");

  // Las primeras son PBQ: avanzar con → hasta una pregunta de opciones.
  for (let i = 0; i < 20 && !(await page.locator("label.opt").count()); i++) await page.keyboard.press("ArrowRight");
  const n = await page.locator(".bar .ctr").innerText();
  await page.keyboard.press("b");
  await expect(page.locator("label.opt").nth(1)).toHaveClass(/sel/);
  await page.keyboard.press("m");
  await expect(page.locator('.bar [data-act="flag"]')).toHaveText("Marcada");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".bar .ctr")).toHaveText(n);
  await expect(page.locator("label.opt").nth(1)).toHaveClass(/sel/);

  // Abrir la hoja con el teclado: el foco entra en ella y queda atrapado.
  await page.locator('.bar [data-act="nav"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sheet")).toBeVisible();
  expect((await active(page)).text).toBe("Cerrar");
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest(".sheet .box"))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".sheet")).toHaveCount(0);
  const back = await active(page);
  expect(back.text).toBe("Preguntas");
  expect(back.outline).toBe("solid 3px");

  // "Siguiente →" con Enter conserva el foco en el botón para seguir avanzando.
  await page.locator('[data-act="next"]').focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  expect((await active(page)).act).toBe("next");
  await expectNoHorizontalScroll(page);
});
