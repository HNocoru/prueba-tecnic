"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { summarizeIssues, type RowIssue } from "@/components/atoms/form-draft";

export type DraftFeedback = { ok: boolean; message: string | null };

/**
 * Estado compartido de los formularios de negocio con renglones:
 * - cambios sin guardar (compara lo que se enviaría con lo último guardado) y aviso al salir;
 * - validación local antes de enviar, con los errores por renglón;
 * - resultado (local o del servidor) listo para el área aria-live.
 * Tras guardar bien no toca lo escrito: solo actualiza la referencia de "guardado".
 */
export function useDraftForm({
  payload,
  state,
  issues,
}: {
  /** Lo que realmente se enviaría (sin renglones vacíos). */
  payload: unknown;
  /** Resultado de la action del servidor. */
  state: DraftFeedback;
  /** Errores de los renglones con datos incompletos. */
  issues: RowIssue[];
}) {
  const signature = JSON.stringify(payload);
  const [saved, setSaved] = useState(signature);
  const [submitted, setSubmitted] = useState(signature);
  const [local, setLocal] = useState<DraftFeedback | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [seenState, setSeenState] = useState(state);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Llegó un resultado nuevo del servidor: se descarta el aviso local y, si fue
  // exitoso, lo enviado pasa a ser lo guardado. Se ajusta durante el render.
  if (seenState !== state) {
    setSeenState(state);
    setLocal(null);
    setAttempted(false);
    if (state.ok) {
      setSaved(submitted);
    }
  }

  const dirty = signature !== saved;
  const feedback: DraftFeedback | null = local ?? (state.message ? state : null);
  const visibleIssues = attempted ? issues : [];

  // Aviso nativo del navegador al cerrar o recargar con cambios sin guardar.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // El resultado puede quedar fuera de pantalla en formularios largos: se lleva a la vista.
  useEffect(() => {
    if (!feedback?.message) {
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    feedbackRef.current?.scrollIntoView?.({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [feedback]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttempted(true);
    const summary = summarizeIssues(issues);
    if (summary) {
      event.preventDefault();
      setLocal({ ok: false, message: summary });
      return;
    }
    setLocal(null);
    setSubmitted(signature);
  }

  return {
    dirty,
    feedback,
    feedbackRef,
    handleSubmit,
    /** Error del campo de un renglón, solo después de intentar guardar. */
    issueFor: (index: number, field: string) =>
      visibleIssues.find((issue) => issue.index === index && issue.field === field)?.message,
  };
}
