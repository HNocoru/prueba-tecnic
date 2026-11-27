import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "min-h-11 w-full rounded-xl border border-surface-2 bg-card px-3 py-2 text-sm text-text placeholder:text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
