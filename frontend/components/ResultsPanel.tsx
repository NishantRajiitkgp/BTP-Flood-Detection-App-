"use client";

import { Download } from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { StatusBadge } from "./StatusBadge";
import { cn, formatKm2, formatPercent } from "@/lib/utils";
import { fileUrl } from "@/lib/api";
import type { JobState } from "@/lib/types";

interface Props {
  job: JobState | null;
  landmaskOpacity: number;
  onLandmaskOpacityChange: (v: number) => void;
}

const DOWNLOADS: Array<{ key: keyof NonNullable<JobState["files"]>; label: string }> = [
  { key: "overlay_tif",        label: "Overlay map (TIF, satellite + red/blue)" },
  { key: "overlay_color_tif",  label: "Overlay color (RGBA TIF, transparent non-water)" },
  { key: "class_tif",          label: "Class map (TIF, 0/1/2)" },
  { key: "flood_tif",          label: "Flood mask (TIF)" },
  { key: "perm_tif",           label: "Permanent water (TIF)" },
  { key: "flood_shp_zip",      label: "Flood polygons (SHP zip)" },
  { key: "perm_shp_zip",       label: "Permanent polygons (SHP zip)" },
  { key: "png",                label: "Report visualization (PNG)" },
  { key: "overlay_water_png",  label: "Water overlay (PNG, red/blue only)" },
];

export function ResultsPanel({ job, landmaskOpacity, onLandmaskOpacityChange }: Props) {
  if (!job) {
    return (
      <aside className="w-80 shrink-0 h-full overflow-y-auto bg-white/95
                         backdrop-blur-sm border-l border-border p-5
                         flex items-center justify-center text-center">
        <p className="text-xs text-muted">
          Predict a region to see results here.
        </p>
      </aside>
    );
  }

  const { status, progress, message, stats, files, error } = job;

  return (
    <aside className="w-80 shrink-0 h-full overflow-y-auto bg-white/95
                       backdrop-blur-sm border-l border-border p-5
                       flex flex-col gap-4">
      <header>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">Prediction</h2>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-muted">job {job.id.slice(0, 8)}…</p>
      </header>

      {/* Progress / message */}
      {(status === "pending" || status === "running") && (
        <Card className="space-y-2">
          <p className="text-xs text-text">{message || "Working…"}</p>
          <div className="h-1.5 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted text-right">
            {Math.round(progress * 100)}%
          </p>
        </Card>
      )}

      {/* Error */}
      {status === "error" && (
        <Card className="border-flood/30 bg-flood/5">
          <CardTitle className="text-flood mb-1">Error</CardTitle>
          <p className="text-xs text-text whitespace-pre-wrap break-words">
            {error || message || "Prediction failed."}
          </p>
        </Card>
      )}

      {/* Landmask opacity slider — only when done. Affects ONLY the gray
          non-water layer; red flood + blue permanent stay constant. */}
      {status === "done" && (
        <Card>
          <CardHeader>
            <CardTitle>Land mask opacity</CardTitle>
            <span className="text-[11px] text-muted">
              {Math.round(landmaskOpacity * 100)}%
            </span>
          </CardHeader>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(landmaskOpacity * 100)}
            onChange={(e) => onLandmaskOpacityChange(Number(e.target.value) / 100)}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>Pure satellite</span>
            <span>Solid land mask</span>
          </div>
          <p className="text-[11px] text-muted mt-2 leading-snug">
            Slider fades the gray non-water mask. Red flood &amp; blue permanent
            water always stay fully opaque.
          </p>
        </Card>
      )}

      {/* Stats + downloads — only when done */}
      {status === "done" && stats && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Affected area</CardTitle>
            </CardHeader>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Flood</dt>
              <dd className="text-right font-medium text-flood">
                {formatKm2(stats.flood_km2)}
              </dd>
              <dt className="text-muted">Permanent</dt>
              <dd className="text-right font-medium text-permanent">
                {formatKm2(stats.permanent_km2)}
              </dd>
              <dt className="text-muted">Total scene</dt>
              <dd className="text-right">{formatKm2(stats.total_km2)}</dd>
              <dt className="text-muted">Flood %</dt>
              <dd className="text-right">{formatPercent(stats.flood_pct)}</dd>
              <dt className="text-muted">Permanent %</dt>
              <dd className="text-right">{formatPercent(stats.permanent_pct)}</dd>
              {stats.date && (
                <>
                  <dt className="text-muted">Date</dt>
                  <dd className="text-right">{stats.date}</dd>
                </>
              )}
              {stats.n_tiles && stats.n_tiles > 1 && (
                <>
                  <dt className="text-muted">Tiles</dt>
                  <dd className="text-right">{stats.n_tiles}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Downloads</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-1">
              {DOWNLOADS.map(({ key, label }) => {
                const filename = files?.[key];
                const enabled = !!filename;
                return (
                  <a
                    key={key}
                    href={enabled ? fileUrl(job.id, filename!) : undefined}
                    target={enabled ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 rounded",
                      "text-xs transition-colors",
                      enabled
                        ? "hover:bg-surface text-text"
                        : "text-muted cursor-not-allowed opacity-60",
                    )}
                  >
                    <span>{label}</span>
                    <Download size={14} />
                  </a>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </aside>
  );
}
