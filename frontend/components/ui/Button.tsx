"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:   "bg-accent text-white hover:bg-[#1a6fc4] focus-visible:shadow-focus",
  secondary: "bg-surface text-text border border-border hover:bg-[#EFEEEA] focus-visible:shadow-focus",
  ghost:     "bg-transparent text-text hover:bg-surface",
  danger:    "bg-flood text-white hover:bg-[#c12a37]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", fullWidth, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium",
          "transition-colors outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          fullWidth && "w-full",
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
