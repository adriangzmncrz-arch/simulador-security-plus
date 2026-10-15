const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa HTML. Todo texto del banco o del usuario pasa por aquí antes de llegar a innerHTML. */
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ENT[c]);

/**
 * Render de stems y explicaciones: bloques ```…``` como <pre><code>, `código` en línea,
 * párrafos por línea en blanco y <br> por salto simple. Siempre escapa antes de insertar etiquetas.
 */
export function rich(s: string): string {
  const parts = String(s).split("```");
  return parts.map((p, i) => {
    if (i % 2 === 1) return "<pre><code>" + esc(p.replace(/^[a-z]*\n/, "").replace(/^\n|\n$/g, "")) + "</code></pre>";
    return p.split(/\n{2,}/).map(par => par.trim() ? "<p>" + esc(par).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>") + "</p>" : "").join("");
  }).join("");
}
