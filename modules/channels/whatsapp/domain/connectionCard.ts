export type ConnectionStatus = "not_connected" | "pending" | "connected" | "disconnected";

export interface ConnectionCardView {
  label: string;
  tone: "ok" | "warn" | "idle";
  description: string;
  showForm: boolean;
}

/** Decisión pura de qué muestra la tarjeta "Conectar WhatsApp" según el estado real. */
export function decideConnectionCard(
  status: ConnectionStatus,
  displayPhone: string | null,
): ConnectionCardView {
  const phone = displayPhone ?? "tu número";
  switch (status) {
    case "connected":
      return {
        label: "Conectado",
        tone: "ok",
        description: `${phone} está conectado y recibiendo mensajes.`,
        showForm: false,
      };
    case "pending":
      return {
        label: "Pendiente",
        tone: "warn",
        description: `Guardamos ${phone}. Falta configurar el webhook en Meta para empezar a recibir mensajes.`,
        showForm: true,
      };
    case "disconnected":
      return {
        label: "Desconectado",
        tone: "warn",
        description: "Tu número se desconectó. Vuelve a vincularlo para seguir atendiendo.",
        showForm: true,
      };
    default:
      return {
        label: "No conectado",
        tone: "idle",
        description: "Vincula el número de WhatsApp de tu negocio.",
        showForm: true,
      };
  }
}
