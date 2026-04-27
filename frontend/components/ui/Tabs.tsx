"use client";

import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border bg-surface p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-all",
              active
                ? "bg-white text-text shadow-sm"
                : "text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
