import type { ReactNode } from "react";

export type NavIconName =
  "home" | "inbox" | "contacts" | "business" | "assistant" | "account" | "logout";

const paths: Record<NavIconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l2 3h4l2-3h5" />
      <path d="M5 4h14l2 9v7H3v-7z" />
    </>
  ),
  contacts: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M17 11a4 4 0 0 0 0-7.7" />
      <path d="M19 15a4 4 0 0 1 3 4v2" />
    </>
  ),
  business: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  assistant: (
    <>
      <path d="M12 3a6 6 0 0 0-6 6c0 2.4 1.4 4 3 5v3h6v-3c1.6-1 3-2.6 3-5a6 6 0 0 0-6-6z" />
      <path d="M9 21h6" />
      <path d="M9.5 9h.01M14.5 9h.01" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

/** Icono decorativo de navegación; la etiqueta da el nombre accesible. */
export function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
