import type { ReactNode } from "react";

import { P5Icon, type P5IconName } from "@/components/atoms/P5Icon";

type P5StateNoticeProps = {
  tone?: "info" | "error" | "success" | "loading";
  icon?: P5IconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

const TONE_STYLE: Record<NonNullable<P5StateNoticeProps["tone"]>, string> = {
  info: "bg-surface text-text",
  error: "bg-status-cancelled-bg text-text",
  success: "bg-status-done-bg text-text",
  loading: "bg-surface text-text",
};

const TONE_ICON: Record<NonNullable<P5StateNoticeProps["tone"]>, P5IconName> = {
  info: "chat",
  error: "alert",
  success: "check",
  loading: "refresh",
};

/** Estados con ícono propio y texto; el color nunca es la única señal. */
export function P5StateNotice({
  tone = "info",
  icon,
  title,
  description,
  action,
}: P5StateNoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex min-w-0 flex-col items-start gap-3 rounded-3xl p-5 md:flex-row md:items-center md:p-6 ${TONE_STYLE[tone]}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card ${tone === "loading" ? "animate-spin" : ""}`}
      >
        <P5Icon name={icon ?? TONE_ICON[tone]} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-lg font-semibold text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </p>
        {description ? <p className="mt-1 text-sm text-text-2">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
