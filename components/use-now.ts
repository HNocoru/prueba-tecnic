"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve la hora actual solo después de montar, y la refresca cada minuto.
 * En el primer render del servidor y del cliente devuelve `null`, así la hora
 * relativa no provoca un desajuste de hidratación.
 */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // El primer valor llega después del paint, no dentro del cuerpo del effect.
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
