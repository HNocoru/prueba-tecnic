"use client";

import { useEffect, useRef } from "react";

import { formatCallOutcome, formatDate, formatDuration, formatTime } from "@/components/format";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { CallSessionSkeleton } from "@/components/molecules/InboxSkeleton";

import { CallSession } from "./CallSession";
import {
  CALL_WINDOW_BACK_TO_CONVERSATION,
  CALL_WINDOW_BACK_TO_SUMMARY,
  CALL_WINDOW_CLOSE,
  CALL_WINDOW_TITLE_SUMMARY,
  CALL_WINDOW_TITLE_TRANSCRIPT,
  CALL_WINDOW_VIEW_TRANSCRIPT,
} from "./inbox-copy";
import type { CallCardData } from "@/components/molecules/CallCard";
import type { CallWindowSessionState } from "./inbox-types";

export type CallWindowView = "summary" | "transcript";

/**
 * Detalle flotante de la llamada: modal centrado en escritorio y hoja inferior en móvil.
 * El elemento nativo `dialog` aporta el atrape de foco y Escape; el título recibe el foco
 * al abrir y el elemento que abrió la ventana lo recupera al cerrar.
 */
export function CallWindow({
  open,
  call,
  state,
  view,
  onViewChange,
  onClose,
}: {
  open: boolean;
  call: CallCardData;
  state: CallWindowSessionState;
  view: CallWindowView;
  onViewChange: (view: CallWindowView) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      titleRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([aria-hidden="true"]):not([tabindex="-1"]), a[href], input, select, textarea',
        ),
      ];
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleClose = () => {
      onClose();
      const opener =
        openerRef.current?.isConnected === true
          ? openerRef.current
          : document.querySelector<HTMLElement>('button[aria-controls="call-window"]');
      opener?.focus({ preventScroll: true });
      // El navegador restaura el foco al cerrar el diálogo; este segundo intento
      // garantiza que el botón que lo abrió recupere el foco transcurrida la transición.
      window.setTimeout(() => opener?.focus({ preventScroll: true }), 100);
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const title = view === "transcript" ? CALL_WINDOW_TITLE_TRANSCRIPT : CALL_WINDOW_TITLE_SUMMARY;

  return (
    <dialog
      ref={dialogRef}
      id="call-window"
      data-call-window
      aria-labelledby="call-window-title"
      className="fixed inset-0 h-dvh w-screen max-w-none overflow-hidden border-0 bg-transparent p-0"
    >
      <style>{`dialog[data-call-window]::backdrop{background:rgba(15,23,42,.55);backdrop-filter:blur(2px)}`}</style>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        role="document"
        className="absolute z-10 inset-x-0 bottom-0 flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-card shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border md:hidden" />
          {view === "transcript" ? (
            <button
              type="button"
              onClick={() => onViewChange("summary")}
              aria-label={CALL_WINDOW_BACK_TO_SUMMARY}
              className="rounded-full border border-border p-2 text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BackIcon />
            </button>
          ) : null}
          <h2
            id="call-window-title"
            ref={titleRef}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate text-base font-semibold text-foreground outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={CALL_WINDOW_CLOSE}
            className="rounded-full border border-border p-2 text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {view === "summary" ? (
            <CallSummary
              call={call}
              state={state}
              onViewTranscript={() => onViewChange("transcript")}
            />
          ) : (
            <section
              aria-label={CALL_WINDOW_TITLE_TRANSCRIPT}
              className="flex min-h-0 flex-col gap-4"
            >
              <CallMeta call={call} />
              {state.status === "loading" ? <CallSessionSkeleton /> : null}
              {state.status === "error" ? (
                <ErrorState message="No se pudo cargar la transcripción de la llamada. Inténtalo de nuevo." />
              ) : null}
              {state.status === "ready" ? <CallSession state={state} /> : null}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CALL_WINDOW_BACK_TO_CONVERSATION}
              </button>
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}

function CallMeta({ call }: { call: CallCardData }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{formatCallOutcome(call.outcome)}</span>
      <span aria-hidden>·</span>
      <span>{formatDuration(call.durationSeconds)}</span>
      <span aria-hidden>·</span>
      <time dateTime={call.startedAt}>
        {formatDate(call.startedAt)} {formatTime(call.startedAt)}
      </time>
    </p>
  );
}

function CallSummary({
  call,
  state,
  onViewTranscript,
}: {
  call: CallCardData;
  state: CallWindowSessionState;
  onViewTranscript: () => void;
}) {
  return (
    <section aria-label="Resumen de la llamada" className="space-y-4">
      <CallMeta call={call} />
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {call.summary?.trim() || "Esta llamada no tiene resumen."}
      </p>
      <button
        type="button"
        onClick={onViewTranscript}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {CALL_WINDOW_VIEW_TRANSCRIPT}
      </button>
      {state.status === "error" ? (
        <EmptyState message="No se pudo cargar la transcripción. Puedes volver a intentarlo." />
      ) : null}
    </section>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
