import type { CallOutcome } from "@/modules/conversations";

/** Formatos fijos en la zona horaria del negocio para evitar diferencias al hidratar. */
const TIME_ZONE = "America/Mexico_City";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "Sin duración";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const DAY_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

export function formatDayLabel(iso: string): string {
  return DAY_FORMATTER.format(new Date(iso));
}

/** Clave estable por día en la zona del negocio para agrupar la línea de tiempo. */
export function formatDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/**
 * Hora relativa para la lista de chats. Recibe `now` desde un hook de cliente
 * para no desajustar la hidratación entre servidor y navegador.
 */
export function formatRelativeTime(iso: string, now: number): string {
  const elapsed = Math.max(now - Date.parse(iso), 0);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) {
    return "Ahora";
  }
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Hace ${days} d`;
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatMoney(amount: number | null): string {
  if (amount === null) {
    return "Sin monto";
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCallOutcome(outcome: CallOutcome): string {
  switch (outcome) {
    case "completed":
      return "Completada";
    case "caller_hangup":
      return "El contacto colgó";
    case "time_limit":
      return "Por tiempo límite";
    case "failed":
      return "Fallida";
    case "missed":
      return "Perdida";
    default:
      return "Sin resultado";
  }
}

/** Iniciales del nombre; si no hay nombre, los dos últimos dígitos del número. */
export function formatInitials(name: string, phone: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toLocaleUpperCase("es-MX") ?? "")
      .join("");
  }
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2) || "?";
}
