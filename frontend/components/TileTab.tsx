"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { todayISO } from "@/lib/utils";
import type { Bbox, CoordinatesRequest } from "@/lib/types";

interface Props {
  drawnBbox: Bbox | null;
  onSubmit: (req: CoordinatesRequest) => void;
  busy: boolean;
}

export function TileTab({ drawnBbox, onSubmit, busy }: Props) {
  const [date, setDate] = useState(todayISO());

  const handle = () => {
    if (!drawnBbox) return;
    const [lon_min, lat_min, lon_max, lat_max] = drawnBbox;
    onSubmit({ lon_min, lat_min, lon_max, lat_max, date });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted leading-relaxed">
        Use the drawing tool on the map (top-right) to mark a rectangular region.
        Click corner points and double-click to finish.
      </p>

      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs font-medium text-muted mb-1">Selected bbox</p>
        {drawnBbox ? (
          <code className="text-[11px] text-text leading-relaxed block break-all">
            lon: {drawnBbox[0].toFixed(4)} → {drawnBbox[2].toFixed(4)}<br />
            lat: {drawnBbox[1].toFixed(4)} → {drawnBbox[3].toFixed(4)}
          </code>
        ) : (
          <p className="text-xs text-muted">No selection yet.</p>
        )}
      </div>

      <Input label="Flood date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <Button onClick={handle} disabled={busy || !drawnBbox} fullWidth>
        {busy ? "Predicting…" : "Predict on selection"}
      </Button>
    </div>
  );
}
