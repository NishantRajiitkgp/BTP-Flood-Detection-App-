# BTP — Flood Prediction Web App

End-to-end flood vs permanent-water segmentation system based on the
DeepSARFlood paper, built on Sen1Floods11.

```
┌─────────────────────────┐     HTTPS     ┌────────────────────────┐
│  Next.js Frontend       │ ────────────> │  Python FastAPI        │
│  (Vercel or localhost)  │               │  (Local + ngrok)       │
│                         │ <──────────── │                        │
│  - MapLibre GL          │   JSON +      │  - FloodPredictor      │
│  - Coords/Tile/Shp tabs │   files       │  - GEE service account │
│  - Polling for jobs     │               │  - rasterio/geopandas  │
└─────────────────────────┘               └────────────────────────┘
```

## What it does

1. User picks a region — by **coordinates**, by **drawing a rectangle on the map**, or by **uploading a `.shp` polygon** (zipped).
2. Backend fetches Sentinel-1 + DEM/Slope/JRC/HAND from Google Earth Engine for that bbox + flood date.
3. ResNet50 + UNet++ runs sliding-window 3-class segmentation.
4. Frontend renders the result over a satellite basemap (red = flood, blue = permanent water) and shows affected area in km².
5. User downloads the result as `.tif` (raster) or `.shp` (vector polygons).

---

# 🚀 RUN THE APP

> Open **two terminals** (Git Bash recommended on Windows). One for backend, one for frontend.

## Terminal 1 — Backend (FastAPI on :8000)

```bash
cd "/c/Users/Nishant Raj/Desktop/BTP new"

export FLOOD_CHECKPOINT="$PWD/checkpoints-v3/best_dice.pth"
export FLOOD_GEE_KEY="$PWD/gee-key.json"
export FLOOD_JOB_DIR="$PWD/.jobs"
export PYTHONIOENCODING=utf-8
export PYTHONUTF8=1

"/c/Users/Nishant Raj/AppData/Local/Python/pythoncore-3.14-64/python.exe" \
    -m uvicorn api:app --host 127.0.0.1 --port 8000 \
    --app-dir flood-detection-src
```

**PowerShell variant** (use this if you're in PowerShell, not Git Bash):

```powershell
cd "C:\Users\Nishant Raj\Desktop\BTP new"

$env:FLOOD_CHECKPOINT = "$PWD\checkpoints-v3\best_dice.pth"
$env:FLOOD_GEE_KEY    = "$PWD\gee-key.json"
$env:FLOOD_JOB_DIR    = "$PWD\.jobs"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8       = "1"

& "C:\Users\Nishant Raj\AppData\Local\Python\pythoncore-3.14-64\python.exe" `
    -m uvicorn api:app --host 127.0.0.1 --port 8000 `
    --app-dir flood-detection-src
```

You'll see `Uvicorn running on http://127.0.0.1:8000`. Verify with:
```bash
curl http://127.0.0.1:8000/api/health
# expects: {"ok":true,"model_loaded":true,"gee_initialized":true,...}
```

## Terminal 2 — Frontend (Next.js on :3000)

```bash
cd "/c/Users/Nishant Raj/Desktop/BTP new/frontend"

# only first time:
cp .env.local.example .env.local

npm run dev
```

Once it prints `Ready on http://localhost:3000`, open that URL in your browser.

---

# 🛑 Stop everything

```bash
# stops both backend AND frontend (kills all python + node)
taskkill //F //IM python.exe //T
taskkill //F //IM node.exe   //T
```

Or just press `Ctrl-C` in each terminal.

---

# 🧪 Quick smoke tests (no browser needed)

After both servers are up, run these from any third terminal:

```bash
# 1. Health check
curl http://127.0.0.1:8000/api/health

# 2. Submit a small Bolivia prediction (returns a job_id)
curl -X POST http://127.0.0.1:8000/api/predict/coordinates \
  -H "Content-Type: application/json" \
  -d '{"lon_min":-66.0,"lat_min":-13.7,"lon_max":-65.95,"lat_max":-13.65,"date":"2018-02-15"}'

# 3. Poll the returned job (replace UUID)
curl http://127.0.0.1:8000/api/jobs/<job_id>

# 4. Download a result file
curl -O http://127.0.0.1:8000/api/files/<job_id>/<filename>
```

Sample shapefiles for testing the **Shapefile** tab live at:
```
frontend/public/sample-shapefiles/
├── bolivia_beni_small.zip       (date: 2018-02-15)
├── bolivia_beni_medium.zip      (date: 2018-02-15)
├── bolivia_irregular.zip        (date: 2018-02-15)  — non-rectangular polygon
└── spain_coastal.zip            (date: 2017-12-29)
```

---

# 🛠️ One-time setup (only if you're on a fresh machine)

## Install Python deps

```bash
"/c/Users/Nishant Raj/AppData/Local/Python/pythoncore-3.14-64/python.exe" \
    -m pip install --user -r backend-requirements.txt
```

If you hit `fiona` build errors on Python 3.14, install everything **except** fiona:

```bash
"/c/Users/Nishant Raj/AppData/Local/Python/pythoncore-3.14-64/python.exe" \
    -m pip install --user fastapi 'uvicorn[standard]' python-multipart pydantic pyngrok \
    rasterio geopandas shapely pyproj pyogrio \
    earthengine-api geedim numpy tqdm matplotlib \
    torch timm albumentations==1.3.1 pillow
```

## Install frontend deps

```bash
cd frontend
npm install
```

## Place the trained checkpoint

```bash
mkdir -p checkpoints-v3
# Download best_dice.pth (130 MB) from your Kaggle dataset
# yash10chawla/flood-checkpoints-v3 and put it here:
#   ./checkpoints-v3/best_dice.pth
```

## Place the GEE service-account JSON

Save your service-account JSON file (from the Kaggle dataset `yash10chawla/last-try-key`) to the project root as `gee-key.json`. **Do not commit it** — `.gitignore` already blocks `*-key.json`.

---

# 🌐 Deploy to Vercel + ngrok (optional, for sharing the demo)

## Get an ngrok auth token

1. Sign up free at https://dashboard.ngrok.com
2. Copy your authtoken from the dashboard
3. Set it as env var **before** starting the backend:
   ```bash
   export NGROK_AUTH_TOKEN="<your-token-here>"
   ```

## Run backend with ngrok tunnel

Use the all-in-one launcher (uvicorn + ngrok in one process):

```bash
cd "/c/Users/Nishant Raj/Desktop/BTP new"

export FLOOD_CHECKPOINT="$PWD/checkpoints-v3/best_dice.pth"
export FLOOD_GEE_KEY="$PWD/gee-key.json"
export FLOOD_JOB_DIR="$PWD/.jobs"
export NGROK_AUTH_TOKEN="<your-token>"

"/c/Users/Nishant Raj/AppData/Local/Python/pythoncore-3.14-64/python.exe" backend-dev.py
```

It prints a public `https://abc123.ngrok-free.app` URL. Copy that.

## Update frontend env

Edit `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE=https://abc123.ngrok-free.app
```

## Deploy frontend to Vercel

```bash
cd frontend
npx vercel --prod
```

When prompted, also set the `NEXT_PUBLIC_API_BASE` env var in the Vercel dashboard to the ngrok URL. Now anyone with your Vercel URL can use the app — predictions run on your laptop.

---

# 📡 API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/health` | Server status |
| POST   | `/api/predict/coordinates` | Start a bbox prediction |
| POST   | `/api/predict/shapefile` | Start a shapefile prediction (multipart) |
| GET    | `/api/jobs/{id}` | Poll job status |
| GET    | `/api/files/{id}/{filename}` | Download an output file |
| DELETE | `/api/jobs/{id}` | Clean up job files |

---

# 📁 Repo layout

```
BTP new/
├── flood-detection-src/         # Python: ML + web API
│   ├── model.py / dataset.py / inference.py / train.py / ...   # Existing ML
│   ├── api.py                   # FastAPI app  ← entrypoint
│   ├── job_runner.py            # async job orchestration
│   ├── shapefile_handler.py     # .shp upload + polygon clipping
│   ├── area_calculator.py       # km² calc via equal-area reproject
│   ├── raster_to_vector.py      # mask → .shp.zip exports
│   └── tiled_predictor.py       # mosaic large bboxes
│
├── frontend/                    # Next.js app
│   ├── app/                     # page.tsx, layout.tsx, globals.css
│   ├── components/              # MapView, InputPanel, ResultsPanel, ...
│   ├── lib/                     # api.ts, types.ts, map-config.ts, utils.ts
│   ├── public/sample-shapefiles/ # demo .zip uploads
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend-dev.py               # uvicorn + ngrok launcher
├── backend-requirements.txt     # FastAPI / geo deps
├── checkpoints-v3/              # trained models (gitignored, 130 MB)
│   └── best_dice.pth
├── gee-key.json                 # GEE service account (gitignored)
├── .jobs/                       # per-prediction outputs (gitignored)
└── NoteBook_final.ipynb         # Kaggle training/inference notebook
```

---

# 🩹 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Model not loaded` in `/api/health` | `FLOOD_CHECKPOINT` missing | Check the env var points at an existing `.pth` file |
| `RuntimeError: This event loop is already running` | (already fixed in code) | n/a |
| `MemoryError` during visualization | (already fixed in code) | n/a |
| `'charmap' codec can't encode '→'` | Console encoding | `export PYTHONIOENCODING=utf-8 PYTHONUTF8=1` |
| `IndexError: index 5 out of bounds, size 5` | No Sentinel-1 image in date window | Try a different `date` (S1 revisit is 6-12 days) |
| Frontend can't reach backend | URL mismatch | Verify `NEXT_PUBLIC_API_BASE` in `frontend/.env.local` matches what the backend prints |
| CORS error in browser | Backend allowlist | Set `FLOOD_FRONTEND_ORIGINS=http://localhost:3000` env var |
| ngrok URL changes on restart | Free-tier behaviour | Pay $8/mo for a static domain, or use Cloudflare Tunnel (free) |

---

# 📚 See also

- [`CLAUDE.md`](CLAUDE.md) — architecture notes for code-assistant sessions
- `IIT_Delhi.pdf` — the original DeepSARFlood paper
- `NoteBook_final.ipynb` — Kaggle notebook for training/inference experiments
