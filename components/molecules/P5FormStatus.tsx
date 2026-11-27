import { P5Icon } from "@/components/atoms/P5Icon";

/** Mensaje de una action de formulario con ícono de resultado. */
export function P5FormStatus({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className={`flex items-center gap-2 text-sm font-medium ${ok ? "text-status-done-fg" : "text-status-cancelled-fg"}`}
    >
      <P5Icon name={ok ? "check" : "alert"} className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
