"use client";

import { useState } from "react";
import { Tabs } from "./ui/Tabs";
import { CoordinatesTab } from "./CoordinatesTab";
import { TileTab } from "./TileTab";
import { ShapefileTab } from "./ShapefileTab";
import type { Bbox, CoordinatesRequest } from "@/lib/types";

type TabValue = "coords" | "tile" | "shapefile";

interface Props {
  drawnBbox: Bbox | null;
  onPredictCoordinates: (req: CoordinatesRequest) => void;
  onPredictShapefile:   (zip: File, date: string) => void;
  onActiveTabChange?:   (tab: TabValue) => void;
  busy: boolean;
}

export function InputPanel({
  drawnBbox,
  onPredictCoordinates,
  onPredictShapefile,
  onActiveTabChange,
  busy,
}: Props) {
  const [tab, setTab] = useState<TabValue>("coords");

  const handleTabChange = (next: TabValue) => {
    setTab(next);
    onActiveTabChange?.(next);
  };

  return (
    <aside className="w-80 shrink-0 h-full overflow-y-auto bg-white/95 backdrop-blur-sm
                       border-r border-border p-5 flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-text">FloodMap</h1>
        <p className="text-xs text-muted mt-0.5">
          3-class flood vs permanent water prediction
        </p>
      </header>

      <Tabs<TabValue>
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: "coords",    label: "Coordinates" },
          { value: "tile",      label: "Tile" },
          { value: "shapefile", label: "Shapefile" },
        ]}
      />

      <div className="mt-1">
        {tab === "coords" && (
          <CoordinatesTab onSubmit={onPredictCoordinates} busy={busy} />
        )}
        {tab === "tile" && (
          <TileTab drawnBbox={drawnBbox} onSubmit={onPredictCoordinates} busy={busy} />
        )}
        {tab === "shapefile" && (
          <ShapefileTab onSubmit={onPredictShapefile} busy={busy} />
        )}
      </div>

      <footer className="mt-auto text-xs text-muted leading-relaxed pt-4 border-t border-border">
        <p>
          ResNet50 + UNet++ trained on Sen1Floods11.<br />
          Runs locally on your laptop via FastAPI.
        </p>
      </footer>
    </aside>
  );
}

export type { TabValue };
