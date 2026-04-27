// Mirrors the FastAPI response schemas in flood-detection-src/api.py +
// JobState in flood-detection-src/job_runner.py

export type JobStatus = "pending" | "running" | "done" | "error";

export interface PredictionStats {
  flood_km2: number;
  permanent_km2: number;
  total_km2: number;
  flood_pct: number;
  permanent_pct: number;
  bbox?: [number, number, number, number]; // [lon_min, lat_min, lon_max, lat_max]
  date?: string;
  bbox_size_km?: [number, number];
  source_crs?: string;
  n_tiles?: number;
}

export interface JobFiles {
  class_tif?: string;
  flood_tif?: string;
  perm_tif?: string;
  flood_shp_zip?: string;
  perm_shp_zip?: string;
  png?: string;
  // Filenames are basenames; the URL is f"{API_BASE}/api/files/{job_id}/{filename}"
}

export interface JobState {
  id: string;
  status: JobStatus;
  progress: number; // 0..1
  message: string;
  stats: PredictionStats | null;
  files: JobFiles | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoordinatesRequest {
  lon_min: number;
  lat_min: number;
  lon_max: number;
  lat_max: number;
  date: string; // YYYY-MM-DD
}

export interface HealthResponse {
  ok: boolean;
  model_loaded: boolean;
  gee_initialized: boolean;
  checkpoint: string;
  init_error: string | null;
}

export type Bbox = [number, number, number, number]; // [west, south, east, north]
