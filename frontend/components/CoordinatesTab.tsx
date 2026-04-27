"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { todayISO } from "@/lib/utils";
import type { CoordinatesRequest } from "@/lib/types";

interface Props {
  onSubmit: (req: CoordinatesRequest) => void;
  busy: boolean;
}

export function CoordinatesTab({ onSubmit, busy }: Props) {
  const [lonMin, setLonMin] = useState("80.5");
  const [latMin, setLatMin] = useState("23.0");
  const [lonMax, setLonMax] = useState("80.9");
  const [latMax, setLatMax] = useState("23.4");
  const [date,   setDate]   = useState(todayISO());
  const [err,    setErr]    = useState<string | null>(null);

  const handle = () => {
    setErr(null);
    const nums = [lonMin, latMin, lonMax, latMax].map((s) => parseFloat(s));
    if (nums.some((n) => Number.isNaN(n))) {
      setErr("All coordinate fields must be numbers.");
      return;
    }
    if (nums[0] >= nums[2] || nums[1] >= nums[3]) {
      setErr("min must be less than max for both longitude and latitude.");
      return;
    }
    onSubmit({
      lon_min: nums[0], lat_min: nums[1],
      lon_max: nums[2], lat_max: nums[3],
      date,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Longitude min" value={lonMin} onChange={(e) => setLonMin(e.target.value)} />
        <Input label="Longitude max" value={lonMax} onChange={(e) => setLonMax(e.target.value)} />
        <Input label="Latitude min"  value={latMin} onChange={(e) => setLatMin(e.target.value)} />
        <Input label="Latitude max"  value={latMax} onChange={(e) => setLatMax(e.target.value)} />
      </div>
      <Input label="Flood date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {err && <p className="text-xs text-flood">{err}</p>}
      <Button onClick={handle} disabled={busy} fullWidth>
        {busy ? "Predicting…" : "Predict floods"}
      </Button>
    </div>
  );
}
