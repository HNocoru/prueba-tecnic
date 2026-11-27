import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full", {
  variants: {
    variant: {
      default: "gap-1.5 bg-surface-2 px-3 py-1 text-xs font-medium text-text",
      /** Sin color propio: el llamador aporta tono y tamaño (estados). */
      plain: "",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
