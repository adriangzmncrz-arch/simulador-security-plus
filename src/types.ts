export type DomainKey = 1 | 2 | 3 | 4 | 5;
export type QuestionType = "single" | "multi" | "match";

export type Question = {
  id: string;            // "D1-001", "D4-101"… único en todo el banco
  domain: DomainKey;
  objective: string;     // "1.1" … "5.6"; empieza con el dígito del dominio
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  stem: string;          // puede contener bloques ```…``` (logs) y `código` en línea
  options?: string[];    // single: 4 opciones; multi: 5–6 opciones
  items?: string[];      // match: 4–6 elementos a clasificar
  choices?: string[];    // match: 3–6 categorías
  answer: number[];      // single: [i]; multi: [i,j(,k)]; match: índice de choice por item
  explanation: string;
};

export type Mode = "exam" | "diag" | "practice" | "missed";

export type Attempt = {
  id: string;            // "a_" + Date.now()
  ts: number;
  label: string;
  mode: Mode;
  n: number;
  score: number;         // suma de puntajes (match da crédito parcial), 3 decimales
  scaled: number | null; // solo exam y diag
  elapsed: number;       // segundos
  limit: number;         // segundos, 0 = sin límite
  timeUp: boolean;
  res: Record<string, number>;
  ans: Record<string, unknown>;
  flags: string[];
};

export type Session = {
  label: string;
  mode: Mode;
  qids: string[];
  ans: Record<string, unknown>;
  flags: string[];
  revealed: Record<string, boolean>;
  idx: number;
  elapsed: number;
  limit: number;
  feedback: boolean;
  ts: number;
};

/** Resultado del último intento de cada pregunta y cuántas veces se ha visto. */
export type Latest = { last: Record<string, number>; seen: Record<string, number> };

export type Agg = { c: number; n: number };

export type View = "home" | "exam" | "result";
export type ReviewFilter = "bad" | "flag" | "all";
export type Theme = "system" | "light" | "dark";

export type SessionConfig = { label: string; mode: Mode; qids: string[]; limit?: number; feedback?: boolean };

/** Estado de la app y operaciones que comparten las vistas (implementado en main.ts). */
export interface App {
  root: HTMLElement;
  view: View;
  attempts: Attempt[];
  S: Session | null;
  sheet: "nav" | null;
  confirmEnd: boolean;
  lastResult: Attempt | null;
  reviewFilter: ReviewFilter;
  /** Mensaje de exportación/importación que se muestra una vez en el pie de la portada. */
  notice: { text: string; ok: boolean } | null;
  theme: Theme;
  render(): void;
  persist(): void;
  startSession(cfg: SessionConfig): void;
  openExam(): void;
  finish(timeUp: boolean): void;
  abandon(): void;
  pauseToHome(): void;
  goHome(): void;
  openResult(a: Attempt): void;
  setAttempts(list: Attempt[]): void;
}

export type Action = (app: App, el: HTMLElement) => void;
