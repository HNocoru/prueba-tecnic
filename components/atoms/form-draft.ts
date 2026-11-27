/** Lógica pura de los formularios de negocio: renglones vacíos, cambios y errores por renglón. */

export type RowIssue = { index: number; field: string; message: string };

type CatalogDraft = { name: string; description: string; price: string };
type FaqDraft = { question: string; answer: string };
type HourDraft = { opens: string; closes: string };

const blank = (value: string) => value.trim() === "";

const isCatalogBlank = (row: CatalogDraft) =>
  blank(row.name) && blank(row.description) && blank(row.price);
const isFaqBlank = (row: FaqDraft) => blank(row.question) && blank(row.answer);
const isHourBlank = (row: HourDraft) => blank(row.opens) && blank(row.closes);

/** Quita los renglones totalmente vacíos (los valores por defecto no cuentan como contenido). */
export function dropBlankCatalogRows<T extends CatalogDraft>(rows: T[]): T[] {
  return rows.filter((row) => !isCatalogBlank(row));
}

/** Quita las preguntas vacías y renumera `position` según el orden restante. */
export function dropBlankFaqRows<T extends FaqDraft & { position: number }>(rows: T[]): T[] {
  return rows.filter((row) => !isFaqBlank(row)).map((row, position) => ({ ...row, position }));
}

export function dropBlankHourRows<T extends HourDraft>(rows: T[]): T[] {
  return rows.filter((row) => !isHourBlank(row));
}

/** Compara lo que se enviaría con lo último guardado. */
export function hasUnsavedChanges(current: unknown, saved: unknown): boolean {
  return JSON.stringify(current) !== JSON.stringify(saved);
}

/** Renglones con datos pero sin nombre. `index` es la posición original en la pantalla. */
export function catalogIssues<T extends CatalogDraft>(rows: T[]): RowIssue[] {
  return rows.flatMap((row, index) =>
    !isCatalogBlank(row) && blank(row.name)
      ? [{ index, field: "name", message: "Escribe el nombre de este elemento." }]
      : [],
  );
}

export function faqIssues<T extends FaqDraft>(rows: T[]): RowIssue[] {
  return rows.flatMap((row, index): RowIssue[] => {
    if (isFaqBlank(row)) return [];
    if (blank(row.question)) return [{ index, field: "question", message: "Escribe la pregunta." }];
    if (blank(row.answer)) return [{ index, field: "answer", message: "Escribe la respuesta." }];
    return [];
  });
}

export function hourIssues<T extends HourDraft>(rows: T[]): RowIssue[] {
  return rows.flatMap((row, index): RowIssue[] => {
    if (isHourBlank(row)) return [];
    if (blank(row.opens))
      return [{ index, field: "opens", message: "Indica la hora de apertura." }];
    if (blank(row.closes))
      return [{ index, field: "closes", message: "Indica la hora de cierre." }];
    return [];
  });
}

/** Mensaje único para el área de resultado; el detalle va junto a cada renglón. */
export function summarizeIssues(issues: RowIssue[]): string | null {
  const numbers = [...new Set(issues.map((issue) => issue.index + 1))];
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return `Revisa el renglón ${numbers[0]}: falta un dato obligatorio.`;
  const head = numbers.slice(0, -1).join(", ");
  return `Revisa los renglones ${head} y ${numbers.at(-1)}: faltan datos obligatorios.`;
}
