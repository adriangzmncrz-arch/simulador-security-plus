import { expect, test } from "@playwright/test";
import { answerCurrent, expectNoHorizontalScroll, submitFromSheet, trackErrors } from "./helpers";

test("diagnóstico completo: responder las 30, entregar, ver resultado, proyección e historial", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("./");
  await expect(page.locator("h1")).toHaveText("Simulador Security+");
  await expect(page.locator(".gauge .big")).toHaveText("—");
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await expect(page.locator(".bar .ttl")).toHaveText("Diagnóstico");
  await expect(page.locator(".bar .ctr")).toHaveText("1/30");
  await expect(page.locator("#timer")).toHaveText(/^3[45]:\d\d$/);
  await expectNoHorizontalScroll(page);

  for (let i = 0; i < 30; i++) {
    await expect(page.locator(".bar .ctr")).toHaveText(`${i + 1}/30`);
    await answerCurrent(page);
    if (i < 29) await page.getByRole("button", { name: "Siguiente →" }).click();
  }
  await page.locator('.dock [data-act="nav"]').click();
  await expect(page.locator(".sheet .box h2")).toHaveText("Revisión antes de entregar");
  await expect(page.locator(".legend")).toContainText("30 respondidas");
  await expect(page.locator(".legend")).toContainText("0 sin responder");
  await expectNoHorizontalScroll(page);
  await page.locator('[data-act="askend"]').click();
  await page.locator('[data-act="finish"]').click();

  await expect(page.locator(".verdict .score")).toContainText("/900");
  await expect(page.locator(".verdict .chip").first()).toHaveText(/^(No aprobado|Aprobado) \(estimado\)$/);
  await expect(page.locator(".verdict")).toContainText("Para 750 necesitas alrededor de 25 aciertos de 30.");
  await expect(page.locator(".objt tbody tr").first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await expect(page.locator(".gauge .big")).toHaveText(/^\d{3}$/);
  await expect(page.locator(".gauge .chip")).toHaveText(/^(Listo para agendar|Al borde: refuerza|Aún no)$/);
  await expect(page.locator(".hist tbody tr")).toHaveCount(1);
  await expect(page.locator(".hist tbody tr").first()).toContainText("Diagnóstico");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("práctica: responder una pregunta y comprobarla", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("./");
  await page.selectOption("#pdom", "1");
  await page.selectOption("#pobj", "1.4");
  await page.selectOption("#pn", "10");
  await page.getByRole("button", { name: "Practicar", exact: true }).click();

  await expect(page.locator(".bar .ttl")).toHaveText("Práctica 1.4");
  await expect(page.locator(".qhead .chip").last()).toHaveText("1.4 · Soluciones criptográficas y PKI");
  const check = page.getByRole("button", { name: "Comprobar" });
  await expect(check).toBeDisabled();
  await answerCurrent(page);
  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.locator(".explain b")).toHaveText(/^(Correcto\.|Incorrecto\.|Parcial: \d+% de los elementos\.)$/);
  await expect(page.locator("label.opt.locked, .mrow select[disabled]").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Siguiente →" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("una sesión interrumpida por recarga se puede continuar o descartar", async ({ page }) => {
  await page.goto("./");
  await page.locator('[data-act="fixed"][data-k="1"]').click();
  await answerCurrent(page);
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await answerCurrent(page);
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(page.locator(".bar .ctr")).toHaveText("3/90");

  await page.reload();
  const resume = page.locator(".resume");
  await expect(resume).toContainText("Tienes un examen en curso: Examen 1");
  await expect(resume).toContainText("Pregunta 3 de 90 · 2 respondidas");
  await resume.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".bar .ctr")).toHaveText("3/90");

  await page.getByRole("button", { name: "Salir" }).click();
  await page.reload();
  await page.locator(".resume").getByRole("button", { name: "Descartar" }).click();
  await expect(page.locator(".resume")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".resume")).toHaveCount(0);
});

test("el reloj usa tiempo real aunque el navegador espacie los ticks y entrega solo al llegar a 0", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await expect(page.locator("#timer")).toHaveText("35:00");

  // Pestaña en segundo plano: el navegador dispara el intervalo una vez por minuto.
  for (let i = 0; i < 10; i++) await page.clock.fastForward(60_000);
  await expect(page.locator("#timer")).toHaveText("25:00");
  await expect(page.locator("#timer")).not.toHaveClass(/warn|crit/);

  for (let i = 0; i < 15; i++) await page.clock.fastForward(60_000);
  await expect(page.locator("#timer")).toHaveText("10:00");
  await expect(page.locator("#timer")).toHaveClass(/warn/);

  for (let i = 0; i < 5; i++) await page.clock.fastForward(60_000);
  await expect(page.locator("#timer")).toHaveText("5:00");
  await expect(page.locator("#timer")).toHaveClass(/crit/);

  for (let i = 0; i < 5; i++) await page.clock.fastForward(60_000);
  await expect(page.locator(".verdict")).toBeVisible();
  await expect(page.locator(".verdict")).toContainText("Se acabó el tiempo");
  await expect(page.locator(".verdict .stats")).toContainText("Tiempo 35:00 de 35:00");
});

test("exportar e importar en un navegador limpio reproduce el historial y la proyección", async ({ page, browser }, info) => {
  await page.goto("./");
  await page.selectOption("#pdom", "4");
  await page.selectOption("#pn", "10");
  await page.getByRole("button", { name: "Practicar", exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await answerCurrent(page);
    await page.getByRole("button", { name: "Comprobar" }).click();
    if (i < 9) await page.getByRole("button", { name: "Siguiente →" }).click();
  }
  await submitFromSheet(page, true);
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await submitFromSheet(page);
  await page.getByRole("button", { name: "Volver al inicio" }).click();

  const projection = await page.locator(".readiness").innerText();
  const history = await page.locator(".hist").innerText();
  expect(await page.locator(".hist tbody tr").count()).toBe(2);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar progreso" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^secplus-progreso-\d{4}-\d{2}-\d{2}\.json$/);
  const file = info.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  await expect(page.locator('footer [role="status"]')).toContainText("Progreso exportado");

  const clean = await browser.newContext(info.project.use);
  const page2 = await clean.newPage();
  const errors = trackErrors(page2);
  await page2.goto(info.project.use.baseURL!);
  await expect(page2.locator(".hist")).toHaveCount(0);
  const [chooser] = await Promise.all([page2.waitForEvent("filechooser"), page2.getByRole("button", { name: "Importar progreso" }).click()]);
  await chooser.setFiles(file);
  await expect(page2.locator('footer [role="status"]')).toHaveText("Importación completa: 2 intentos nuevos.");
  expect(await page2.locator(".readiness").innerText()).toBe(projection);
  expect(await page2.locator(".hist").innerText()).toBe(history);

  // Importar el mismo archivo otra vez no duplica.
  const [again] = await Promise.all([page2.waitForEvent("filechooser"), page2.getByRole("button", { name: "Importar progreso" }).click()]);
  await again.setFiles(file);
  await expect(page2.locator('footer [role="status"]')).toHaveText("Importación completa: ningún intento nuevo, 2 ya estaban en este navegador.");
  await expect(page2.locator(".hist tbody tr")).toHaveCount(2);
  expect(errors).toEqual([]);
  await clean.close();
});

test("selector de tema: Claro y Oscuro ganan al tema del sistema y se recuerdan", async ({ page }) => {
  await page.goto("./");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByRole("button", { name: "Oscuro" }).click();
  expect(await bg()).toBe("rgb(13, 18, 25)");
  await page.reload();
  expect(await bg()).toBe("rgb(13, 18, 25)");
  await expect(page.getByRole("button", { name: "Oscuro" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Claro" }).click();
  expect(await bg()).toBe("rgb(243, 245, 248)");
  await page.getByRole("button", { name: "Sistema" }).click();
  const dark = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
  expect(await bg()).toBe(dark ? "rgb(13, 18, 25)" : "rgb(243, 245, 248)");
});
