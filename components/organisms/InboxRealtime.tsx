"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/shared/supabase/client";

const DEBOUNCE_MS = 300;
const TABLES = ["messages", "conversations", "calls"] as const;

type Status = "connecting" | "live" | "offline";

const STATUS_LABEL: Record<Status, string> = {
  connecting: "Conectando…",
  live: "En vivo",
  offline: "Sin conexión en vivo",
};

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-muted-foreground",
  live: "bg-green-500",
  offline: "bg-destructive",
};

/**
 * Escucha cambios de messages, conversations y calls y pide al servidor datos
 * frescos con router.refresh() (con debounce). No filtra ni transforma datos:
 * la RLS con el JWT del usuario decide qué eventos recibe.
 */
export function InboxRealtime() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }
      // Realtime evalúa la RLS con este token; sin sesión no hay suscripción.
      if (!data.session) {
        setStatus("offline");
        return;
      }
      void supabase.realtime.setAuth(data.session.access_token);

      let next = supabase.channel("inbox-changes");
      for (const table of TABLES) {
        next = next.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table },
          scheduleRefresh,
        );
        next = next.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table },
          scheduleRefresh,
        );
      }
      channel = next.subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
          // Recupera lo ocurrido mientras el canal estuvo caído.
          scheduleRefresh();
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("offline");
        }
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);

  return (
    <p
      role="status"
      className="mb-2 flex items-center justify-end gap-2 text-xs text-muted-foreground"
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </p>
  );
}
