export const pct = (x: number) => Math.round(x * 100) + "%";

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) + " · " +
  new Date(ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
