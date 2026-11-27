/** Pure presentation rules shared by the S17 screens. No data access, no React. */

const EMPTY_PREVIEW = "Sin capturar";
const RELATIVE_DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function trimmed(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function dayKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function contactInitials(name: string, redacted = false): string {
  const cleaned = trimmed(name);
  if (redacted || cleaned === "") {
    return "—";
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("es-MX"))
    .join("");
}

export function filterContactItems<T extends { name: string; phone: string }>(
  items: T[],
  query: string,
): T[] {
  const normalized = trimmed(query).toLocaleLowerCase("es-MX");
  if (normalized === "") {
    return items;
  }

  return items.filter((item) =>
    `${item.name} ${item.phone}`.toLocaleLowerCase("es-MX").includes(normalized),
  );
}

export function mergeContactsById<T extends { id: string }>(first: T[], second: T[]): T[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function contactCountLabel(shown: number, total: number, query: string): string {
  const cleaned = trimmed(query);
  if (cleaned !== "") {
    return `${total} ${total === 1 ? "resultado" : "resultados"} para «${cleaned}»`;
  }
  return `Mostrando ${shown} de ${total} contactos`;
}

export function noContactResultsTitle(query: string): string {
  return `No encontramos a nadie con «${trimmed(query)}»`;
}

export function relativeDay(iso: string, now: Date = new Date()): string {
  const dateKey = dayKey(iso);
  const todayKey = dayKey(now);
  if (!dateKey || !todayKey) {
    return "—";
  }

  if (dateKey === todayKey) {
    return "Hoy";
  }

  const yesterday = new Date(`${todayKey}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (dateKey === dayKey(yesterday)) {
    return "Ayer";
  }

  return RELATIVE_DATE.format(new Date(`${dateKey}T00:00:00Z`));
}

export function sectionProgressLabel(filled: number, total: number): string {
  return `${filled} de ${total} secciones con información`;
}

export function previewText(value: string | null | undefined, fallback = EMPTY_PREVIEW): string {
  return trimmed(value) || fallback;
}

export function voiceLabel(voice: "roberto" | "eduardo"): string {
  return voice === "eduardo" ? "Eduardo" : "Roberto";
}

export function languageLabel(language: string): string {
  return trimmed(language) === "es-MX" ? "Español de México" : trimmed(language);
}

export function accountSummary(email: string, displayName?: string | null) {
  const cleanedEmail = trimmed(email);
  const name = trimmed(displayName) || trimmed(cleanedEmail.split("@")[0]);

  return {
    email: cleanedEmail,
    name,
    initials: contactInitials(name),
  };
}
