import type { ReactNode } from "react";

/** Iconos en línea de la dirección A: trazo coherente y sin dependencia nueva. */
export type P5IconName =
  | "alert"
  | "chat"
  | "check"
  | "clock"
  | "close"
  | "down"
  | "inbox"
  | "logout"
  | "mail"
  | "phone"
  | "plus"
  | "refresh"
  | "search"
  | "sparkles"
  | "trash"
  | "up"
  | "user";

const PATHS: Record<P5IconName, ReactNode> = {
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16h.01" />
    </>
  ),
  chat: <path d="M20 12a8 8 0 0 1-8 8 8.7 8.7 0 0 1-3.6-.8L4 20l1-4.2A8 8 0 1 1 20 12Z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  close: <path d="M9 9l6 6M15 9l-6 6" />,
  down: <path d="m7 10 5 5 5-5" />,
  inbox: (
    <>
      <path d="M4 13h4l2 3h4l2-3h4" />
      <path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2-8Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 16l4-4-4-4" />
      <path d="M18 12H9" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2.5 2.5 0 0 1-2.7 2.5A16 16 0 0 1 4 7.7 2.5 2.5 0 0 1 6.5 3Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 0-14-5.3L4 9" />
      <path d="M4 4v5h5" />
      <path d="M4 12a8 8 0 0 0 14 5.3L20 15" />
      <path d="M20 20v-5h-5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7L18 15Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  up: <path d="m7 14 5-5 5 5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export function P5Icon({ name, className = "h-5 w-5" }: { name: P5IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
