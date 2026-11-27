import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { CallSessionSkeleton } from "@/components/molecules/InboxSkeleton";

import type { CallSessionData } from "./inbox-types";

type SessionState =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: CallSessionData };

/** Transcripción de una llamada: turnos del cliente a la izquierda y del asistente a la derecha. */
export function CallSession({ state }: { state: SessionState }) {
  if (state.status === "loading") {
    return <CallSessionSkeleton />;
  }
  if (state.status === "error") {
    return (
      <ErrorState message="No se pudo cargar la transcripción de la llamada. Inténtalo de nuevo." />
    );
  }

  const { turns } = state.data;
  if (turns.length === 0) {
    return (
      <EmptyState message="Esta llamada no tiene transcripción. Puedes volver a la conversación para ver el resto de la actividad." />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ol className="space-y-3">
        {turns.map((turn) => {
          const assistant = turn.role === "assistant";
          return (
            <li key={turn.id} className={`flex ${assistant ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[68%] ${
                  assistant
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                }`}
              >
                <p className="sr-only">{assistant ? "Asistente:" : "Cliente:"}</p>
                <p className="break-words whitespace-pre-wrap">{turn.text}</p>
                <p
                  className={`mt-1 text-right text-[11px] ${
                    assistant ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  Turno {turn.position}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
