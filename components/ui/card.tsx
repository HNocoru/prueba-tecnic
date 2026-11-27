import { Slot } from "@radix-ui/react-slot";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "min-w-0 rounded-3xl border border-surface-2 bg-card p-4 shadow-sm md:p-6",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
