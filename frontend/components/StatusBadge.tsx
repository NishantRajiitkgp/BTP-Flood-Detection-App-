"use client";

import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const styles: Record<JobStatus, string> = {
  pending: "bg-surface text-muted",
  running: "bg-accent/10 text-accent",
  done:    "bg-permanent/10 text-permanent",
  error:   "bg-flood/10 text-flood",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium",
        styles[status],
      )}
    >
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "running" && "animate-pulse",
        status === "pending" ? "bg-muted" :
        status === "running" ? "bg-accent" :
        status === "done"    ? "bg-permanent" : "bg-flood",
      )} />
      {status}
    </span>
  );
}
