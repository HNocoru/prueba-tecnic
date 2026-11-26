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
