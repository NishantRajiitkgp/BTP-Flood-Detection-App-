"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { todayISO, cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface Props {
  onSubmit: (zip: File, date: string) => void;
  busy: boolean;
}

export function ShapefileTab({ onSubmit, busy }: Props) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [date,    setDate]    = useState(todayISO());
  const [err,     setErr]     = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setErr(null);
    const file = accepted[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setErr("Please upload a .zip containing the .shp/.shx/.dbf/.prj files.");
      return;
    }
    setZipFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/zip": [".zip"] },
  });

  const handle = () => {
    if (!zipFile) return;
    onSubmit(zipFile, date);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          "border border-dashed rounded-md p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-accent bg-accent/5" : "border-border bg-surface hover:bg-[#EFEEEA]",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-2 text-muted" size={20} />
        {zipFile ? (
          <p className="text-xs text-text font-medium break-all">
            {zipFile.name}
            <span className="block text-muted font-normal">
              {(zipFile.size / 1024).toFixed(1)} KB
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted">
            {isDragActive ? "Drop the .zip here" : "Drag a zipped shapefile, or click"}
          </p>
        )}
      </div>

      {err && <p className="text-xs text-flood">{err}</p>}

      <Input label="Flood date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <Button onClick={handle} disabled={busy || !zipFile} fullWidth>
        {busy ? "Predicting…" : "Predict on shapefile"}
      </Button>
    </div>
  );
}
