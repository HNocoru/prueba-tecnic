import type { Ref } from "react";

import { P5Icon } from "@/components/atoms/P5Icon";

/**
 * Resultado del guardado. El contenedor aria-live existe siempre (los lectores de
 * pantalla solo anuncian cambios en una región ya presente) y se lleva a la vista.
 */
export function FormFeedback({
  feedback,
  innerRef,
}: {
  feedback: { ok: boolean; message: string | null } | null;
  innerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={innerRef} role="status" aria-live="polite" aria-atomic="true">
      {feedback?.message ? (
        <p
          className={`flex items-center gap-2 text-sm font-medium ${feedback.ok ? "text-status-done-fg" : "text-status-cancelled-fg"}`}
        >
          <P5Icon name={feedback.ok ? "check" : "alert"} className="h-4 w-4 shrink-0" />
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

/** Indicador discreto junto al botón de guardar. */
export function UnsavedChanges({ dirty }: { dirty: boolean }) {
  return dirty ? <p className="text-xs text-text-2">Tienes cambios sin guardar</p> : null;
}

/** Mensaje de error de un campo; se enlaza con aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs font-medium text-status-cancelled-fg">
      {message}
    </p>
  ) : null;
}
