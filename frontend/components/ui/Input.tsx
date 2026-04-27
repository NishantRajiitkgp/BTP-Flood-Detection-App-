"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1">
        {label && (
          <span className="text-xs font-medium text-muted">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "rounded border border-border bg-white px-3 py-1.5 text-sm",
            "outline-none transition-shadow",
            "focus-visible:shadow-focus focus-visible:border-accent",
            "placeholder:text-muted/70",
            className,
          )}
          {...props}
        />
      </label>
    );
  },
);

Input.displayName = "Input";
