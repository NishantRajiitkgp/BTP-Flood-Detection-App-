"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { type Map as MLMap, type MapMouseEvent } from "maplibre-gl";

import {
  SATELLITE_STYLE,
  STREET_STYLE,
  INITIAL_VIEW,
  PREDICTION_SOURCE_ID,
  PREDICTION_LAYER_ID,
} from "@/lib/map-config";
import type { Bbox } from "@/lib/types";
import { cn } from "@/lib/utils";

type Basemap = "satellite" | "street";

interface MapViewProps {
  onBboxDrawn?: (bbox: Bbox | null) => void;
  predictionOverlay?: { url: string; bbox: Bbox } | null;
  drawingEnabled: boolean;
}

const PREVIEW_SOURCE = "bbox-draw-preview-src";
const PREVIEW_FILL   = "bbox-draw-preview-fill";
const PREVIEW_LINE   = "bbox-draw-preview-line";

function bboxAsPolygon(lonMin: number, latMin: number, lonMax: number, latMax: number) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [lonMin, latMin], [lonMax, latMin],
        [lonMax, latMax], [lonMin, latMax],
        [lonMin, latMin],
      ]],
    },
  };
}

export function MapView({
  onBboxDrawn,
  predictionOverlay,
  drawingEnabled,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const corner1Ref = useRef<[number, number] | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [hint, setHint] = useState<string>("Click two corners on the map to draw a rectangle");

  // -------- map init --------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // -------- basemap swap (preserve overlay/preview after style reload) --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(basemap === "satellite" ? SATELLITE_STYLE : STREET_STYLE);
  }, [basemap]);

  // -------- click-twice rectangle drawing --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cleanup = () => {
      corner1Ref.current = null;
      if (map.getLayer(PREVIEW_FILL)) map.removeLayer(PREVIEW_FILL);
      if (map.getLayer(PREVIEW_LINE)) map.removeLayer(PREVIEW_LINE);
      if (map.getSource(PREVIEW_SOURCE)) map.removeSource(PREVIEW_SOURCE);
      map.getCanvas().style.cursor = "";
      setHint("Click two corners on the map to draw a rectangle");
    };

    if (!drawingEnabled) {
      cleanup();
      onBboxDrawn?.(null);
      return;
    }

    map.getCanvas().style.cursor = "crosshair";
    setHint("Click the first corner");

    const upsertPreview = (lonMin: number, latMin: number, lonMax: number, latMax: number) => {
      const data = bboxAsPolygon(lonMin, latMin, lonMax, latMax);
      const src = map.getSource(PREVIEW_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(data as GeoJSON.Feature);
      } else {
        map.addSource(PREVIEW_SOURCE, { type: "geojson", data: data as GeoJSON.Feature });
        map.addLayer({
          id: PREVIEW_FILL,
          type: "fill",
          source: PREVIEW_SOURCE,
          paint: { "fill-color": "#2383E2", "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: PREVIEW_LINE,
          type: "line",
          source: PREVIEW_SOURCE,
          paint: { "line-color": "#2383E2", "line-width": 2 },
        });
      }
    };

    const onClick = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      if (!corner1Ref.current) {
        corner1Ref.current = [lng, lat];
        setHint("Click the second corner");
        return;
      }
      const [x1, y1] = corner1Ref.current;
      const lonMin = Math.min(x1, lng);
      const lonMax = Math.max(x1, lng);
      const latMin = Math.min(y1, lat);
      const latMax = Math.max(y1, lat);
      upsertPreview(lonMin, latMin, lonMax, latMax);
      onBboxDrawn?.([lonMin, latMin, lonMax, latMax]);
      corner1Ref.current = null;
      setHint("Drawn. Click again to redraw, or hit \"Predict on selection\".");
    };

    const onMove = (e: MapMouseEvent) => {
      if (!corner1Ref.current) return;
      const [x1, y1] = corner1Ref.current;
      const { lng, lat } = e.lngLat;
      upsertPreview(
        Math.min(x1, lng), Math.min(y1, lat),
        Math.max(x1, lng), Math.max(y1, lat),
      );
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      cleanup();
    };
  }, [drawingEnabled, onBboxDrawn]);

  // -------- prediction overlay --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (map.getLayer(PREDICTION_LAYER_ID)) map.removeLayer(PREDICTION_LAYER_ID);
      if (map.getSource(PREDICTION_SOURCE_ID)) map.removeSource(PREDICTION_SOURCE_ID);

      if (!predictionOverlay) return;
      const { url, bbox } = predictionOverlay;
      const [lonMin, latMin, lonMax, latMax] = bbox;

      map.addSource(PREDICTION_SOURCE_ID, {
        type: "image",
        url,
        coordinates: [
          [lonMin, latMax], [lonMax, latMax],
          [lonMax, latMin], [lonMin, latMin],
        ],
      });
      map.addLayer({
        id: PREDICTION_LAYER_ID,
        type: "raster",
        source: PREDICTION_SOURCE_ID,
        paint: { "raster-opacity": 0.7 },
      });
      map.fitBounds(
        [[lonMin, latMin], [lonMax, latMax]],
        { padding: 60, duration: 1500 },
      );
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [predictionOverlay]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating basemap toggle */}
      <div className="absolute top-4 left-4 inline-flex rounded-md border border-border bg-white shadow-sm">
        {(["satellite", "street"] as const).map((bm) => (
          <button
            key={bm}
            onClick={() => setBasemap(bm)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              basemap === bm ? "bg-accent text-white" : "text-text hover:bg-surface",
              bm === "satellite" ? "rounded-l-md" : "rounded-r-md",
            )}
          >
            {bm === "satellite" ? "Satellite" : "Street"}
          </button>
        ))}
      </div>

      {drawingEnabled && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5
                        rounded-md bg-white shadow-sm border border-border
                        text-xs text-text">
          {hint}
        </div>
      )}
    </div>
  );
}
