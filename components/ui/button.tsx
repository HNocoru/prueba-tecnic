import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Variantes calibradas con los tokens de la dirección A para reproducir el aspecto
 * que ya tenían los botones escritos a mano (objetivo táctil mínimo de 44 px).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-accent font-semibold text-canvas hover:bg-accent-hover",
        secondary: "border border-surface-2 bg-card font-medium text-text hover:bg-surface",
        outline: "border border-border font-semibold text-text hover:bg-surface-2",
        destructive:
          "bg-destructive font-semibold text-canvas hover:opacity-90 disabled:hover:opacity-60",
        ghost: "font-semibold text-accent hover:bg-soft",
      },
      size: {
        default: "min-h-11 px-5",
        sm: "min-h-11 px-4",
        lg: "min-h-12 w-full px-6 text-base",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
