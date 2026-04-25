# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Re-implementation of the **DeepSARFlood** flood-segmentation pipeline (IIT Delhi 2025) on the **Sen1Floods11** dataset. All training/inference code lives in `flood-detection-src/`. The original notebook is `NoteBook.ipynb`; the paper PDF is `IIT_Delhi.pdf`. Trained checkpoints live in `checkpoints-v2/`. Raw imagery lives under `BTP-SenData/` (HandLabeled + WeaklyLabeled S1/S2/Label/JRCWaterHand subdirs).

## Common commands

Train all four loss-variant models + greedy model soup (run from `flood-detection-src/`):

```
python train.py --data_root <path>/Sen1Floods11/v1.1/data/flood_events \
                --splits_root <path>/Sen1Floods11/v1.1/splits/flood_handlabeled \
                --checkpoint_dir ../checkpoints-v2 \
                --epochs 400 --batch_size 12
```

Train a single loss only: add `--loss tversky` (choices: `dice`, `jaccard`, `tversky`, `focal_tversky`).

Inference from a local 6-band GeoTIFF:
```
python inference.py tif --input scene.tif --checkpoint ../checkpoints-v2/model_soup.pth --output_dir outputs/
```

Inference by fetching from Google Earth Engine:
```
python inference.py gee --lon_min .. --lat_min .. --lon_max .. --lat_max .. --date YYYY-MM-DD \
                       --checkpoint ../checkpoints-v2/model_soup.pth --output_dir outputs/
```

Module-level smoke tests (each file has `if __name__ == "__main__"` shape checks): `python model.py`, `python losses.py`, `python metrics.py`, `python augmentations.py`, `python dataset.py`.

There is no test suite, linter config, or build system — this is a research codebase driven by the notebook + scripts.

## Architecture

**Model (`model.py`)** — `FloodSegmentationModel`: ResNet50 encoder (timm, pretrained ImageNet, patched for 6-channel input via `in_chans=6`) → UNet++ decoder with dense nested skip connections + SCSE attention → two heads:
1. `SegmentationHead` → 3-class flood logits (`0=non-water`, `1=flood`, `2=permanent water`)
2. `RegressionHead` → MNDWI prediction in [0, 1] (auxiliary MTL task)

Encoder features are extracted at 5 levels (`out_indices=(0,1,2,3,4)`), channels `[64, 256, 512, 1024, 2048]`. Decoder upsamples bilinearly and concatenates skips. Both heads' outputs are interpolated back to input resolution if needed.

**Input contract** — `(B, 6, 512, 512)`, channel order **must** be `[S1-VV, S1-VH, DEM, Slope, JRC, HAND]`. Same order is enforced in dataset loading, GEE fetching, and inference preprocessing — changing it breaks all three.

**Dataset (`dataset.py`)** — `FloodDataset` reads Sen1Floods11 v1.1 layout. Splits come from CSVs (`flood_train_data.csv` etc.) with a TXT fallback. `_extract_base_id` strips known suffixes (`_S1Hand`, `_LabelHand`, `_JRCWaterHand`, …) to derive a base ID like `Bolivia_103757`, then `__getitem__` rebuilds full paths per band. Auxiliary bands (DEM/Slope/HAND) are expected on disk (fetch them once with `fetch_aux_bands.py` — see below); if missing, the loader still works but uses constant fallback planes. Per-band normalization uses `BAND_STATS` global min/max → [0, 1]. **Labels are 3-class `{-1, 0, 1, 2}`** built at load time by `build_three_class_label(label_hand, jrc_raw, threshold=5.0)`: pixels with `LabelHand==1 AND JRC seasonality >= 5` become class `2 (permanent)`, the rest of `LabelHand==1` stay class `1 (flood)`, `LabelHand==0` is class `0 (non-water)`, and `-1` is the ignore sentinel. MNDWI target is computed on-the-fly from S2 (green/SWIR), clipped to `[0, 0.5]`.

**Auxiliary band prep (`fetch_aux_bands.py`)** — One-time GEE downloader. For every `S1Hand` chip on disk, pulls NASADEM, slope, and HAND for that footprint and writes them under `<data_root>/HandLabeled/{DEM,Slope,HAND}/<base_id>_<band>.tif`, reprojected onto the S1 grid. Idempotent — re-running skips chips that already have all outputs.

**Training (`train.py`)** — `main()` orchestrates 4 sequential training runs, one per loss in `LOSS_NAMES = ["dice", "jaccard", "tversky", "focal_tversky"]`, then builds a **greedy model soup**:
- RMSprop + ReduceLROnPlateau on val IoU, AMP via `torch.amp` on CUDA, gradient clipping at 1.0.
- Early stop after `patience_stop=20` epochs with no IoU improvement, or when LR ≤ `min_lr`.
- Each run saves `best_<loss>.pth` to `checkpoint_dir`.
- `greedy_model_soup` ranks models by val IoU, then iteratively averages each candidate's non-BN weights into the soup, recalibrates BN stats with `_recalibrate_bn` over 50 train batches, and only keeps the candidate if val IoU does not regress. Final soup → `model_soup.pth`.

**Losses (`losses.py`)** — Multi-class formulation. All four seg losses (Dice/Jaccard/Tversky/FocalTversky) compute their term per foreground class (`1 = flood`, `2 = permanent`) and average; `targets < 0` is masked out everywhere. `MTLLoss` combines `0.9 * seg_loss + 0.1 * L1(mndwi_pred, clip(mndwi_target, 0, 0.5))`. `get_mtl_loss(name)` is the standard entry point used by the trainer.

**Metrics (`metrics.py`)** — `MetricTracker` accumulates per-class TP/FP/FN (classes `{1, 2}`, ignoring `-1`) and reports `iou_flood`, `iou_permanent`, `iou_mean`, plus `f1_*`/`precision_*`/`recall_*`. `iou`/`f1` are aliases for the means and are what `train.py` reads for early stopping. `update()` accepts either `(B, C, H, W)` softmax probs or a `(B, H, W)` argmax map.

**Inference (`inference.py`)** — Two pipelines share `predict_from_geotiff`:
1. `GEEDataFetcher` builds a 6-band stack (Sentinel-1 mean over `[date, date+2D]`, NASADEM, slope, JRC seasonality, HAND) and downloads via `geedim`.
2. `sliding_window_predict` runs 512×512 windows at stride 400 (overlapping) and returns the **full `(C, H, W)` softmax stack** averaged in overlap regions with reflect-padding so all pixels get coverage.
3. `postprocess` takes argmax over channels {non-water, flood, permanent}, zeros out pixels with `slope > 5%`, and applies an optional JRC-based override to push any "flood" pixel with `JRC seasonality > 5` into the permanent class. Returns `(class_map, flood_mask, permanent_mask)`.
4. `visualize_flood_map` renders **red = flood (`#E63946`), blue = permanent water (`#1E90FF`)**, light gray for non-water.

**Checkpoints** — `.pth` files store `{"model_state": ..., "epoch": ..., "iou": ..., "loss": ...}`. `FloodPredictor._load_model` accepts both that dict shape and a raw state_dict.

## Conventions

- All scripts insert their own dir into `sys.path` (`sys.path.insert(0, os.path.dirname(__file__))`) so cross-imports work whether invoked from project root or `flood-detection-src/`.
- Channel order and band-name keys in `BAND_STATS` / `BAND_ORDER` are load-bearing — keep them in sync with `inference.load_and_normalize` and the GEE band stack.
- Label value `-1` is the universal "ignore" sentinel; any new loss/metric must filter it out.
- The class layout `{0: non-water, 1: flood, 2: permanent}` is fixed across `dataset.build_three_class_label`, the `losses.FOREGROUND_CLASSES` constant, the `metrics.CLASS_NAMES` table, and the inference postprocess. Renumbering anywhere requires touching all four.
- The JRC permanent-water threshold (`5` months/yr) appears in `dataset.JRC_PERMANENT_THRESHOLD` and `inference.postprocess`'s default — keep them aligned to keep training and inference semantics consistent.
