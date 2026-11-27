import { formatInitials } from "@/components/format";

const TONES = [
  "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
];

/** Avatar de iniciales; el nombre completo está siempre visible al lado. */
export function Avatar({
  name,
  phone,
  className = "",
}: {
  name: string;
  phone: string;
  className?: string;
}) {
  let hash = 0;
  for (const char of `${name}${phone}`) {
    hash = (hash * 31 + char.charCodeAt(0)) % TONES.length;
  }

  return (
    <span
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase ${TONES[hash]} ${className}`}
    >
      {formatInitials(name, phone)}
    </span>
  );
}
