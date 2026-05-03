#!/usr/bin/env python3
"""
One-shot script: reads plantilla-correccion.png → public/answer-key.json.
Output: { "1": [col, ...], ..., "14": [...] }  (columns 1-indexed, 1-47)
"""
import cv2, numpy as np, json, sys
from pathlib import Path

BASE     = Path(__file__).parent.parent
IMG_PATH = BASE / "public" / "plantilla-correccion.png"
OUT_PATH = BASE / "public" / "answer-key.json"
DEBUG    = "--debug" in sys.argv

img = cv2.imread(str(IMG_PATH))
assert img is not None, f"Cannot load {IMG_PATH}"
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, bw = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)

# ── Column centers from top number row ───────────────────────────────────────
header_proj = bw[0:90, :].sum(axis=0)
blobs, i = [], 0
while i < len(header_proj):
    if header_proj[i] > 0:
        j = i
        while j < len(header_proj) and header_proj[j] > 0: j += 1
        blobs.append((i+j)//2)
        i = j
    else:
        i += 1

groups, g = [], [blobs[0]]
for b in blobs[1:]:
    if b - g[-1] <= 14: g.append(b)
    else:
        groups.append(int(np.mean(g))); g = [b]
groups.append(int(np.mean(g)))
col_centers = [x for x in groups if x < 1800]
assert len(col_centers) == 47, f"Got {len(col_centers)} column centers (expected 47)"
col_w = int(np.median([col_centers[i+1]-col_centers[i] for i in range(46)]))
print(f"Columns: 47, col_w={col_w}px, x={col_centers[0]}–{col_centers[-1]}")

# ── Row bounds: rectangle top/bottom pairs ───────────────────────────────────
row_sum = bw.sum(axis=1)
sep_centers = []
cands = np.where(row_sum > row_sum.max() * 0.6)[0]
if len(cands):
    g = [int(cands[0])]
    for y in cands[1:]:
        if y == g[-1]+1: g.append(y)
        else:
            sep_centers.append(int(np.mean(g))); g = [y]
    sep_centers.append(int(np.mean(g)))

# Group separator centers into (top, bottom) pairs per row (gap ≈ 50-60px)
raw_pairs = []
k = 0
while k < len(sep_centers)-1:
    gap = sep_centers[k+1] - sep_centers[k]
    if 40 <= gap <= 80:
        raw_pairs.append((sep_centers[k], sep_centers[k+1])); k += 2
    else:
        k += 1

# Assign detected pairs to the 14 rows by proximity to expected position
GRID_TOP    = sep_centers[0]  if sep_centers else 91
GRID_BOTTOM = sep_centers[-1] if sep_centers else 1289
row_h = (GRID_BOTTOM - GRID_TOP) / 14.0
rect_h = int(raw_pairs[0][1] - raw_pairs[0][0]) if raw_pairs else 55  # ~55px

row_bounds: list[tuple[int,int]] = []
for r in range(14):
    expected_top = int(GRID_TOP + r * row_h)
    found = next((p for p in raw_pairs if abs(p[0]-expected_top) <= 40), None)
    if found:
        row_bounds.append(found)
    else:
        # No pair detected → estimate from position of surrounding pairs
        prev_bot = row_bounds[-1][1] if row_bounds else expected_top
        # separator gap ≈ row_h - rect_h
        sep_gap = int(row_h - rect_h)
        y1 = prev_bot + sep_gap
        y2 = y1 + rect_h
        print(f"  Row {r+1}: interpolated y={y1}–{y2}")
        row_bounds.append((y1, y2))

print(f"Row bounds: {len(row_bounds)} rows")
for i, (y1, y2) in enumerate(row_bounds):
    print(f"  Row {i+1:2d}: y={y1}–{y2}")

# ── Sample each cell with a clear margin ─────────────────────────────────────
MARGIN = 3
densities = np.zeros((14, 47))
for r, (y1, y2) in enumerate(row_bounds):
    for c, cx in enumerate(col_centers):
        x1 = cx - col_w//2
        x2 = cx + col_w//2
        patch = bw[y1+MARGIN:y2-MARGIN, x1+MARGIN:x2-MARGIN]
        densities[r, c] = float(patch.mean()) if patch.size > 0 else 0.0

flat = densities.flatten()
# Distribution is bimodal: blank cells at exactly 0, rectangle cells at density > 0
# Use threshold = midpoint of gap (which is between 0 and the minimum non-zero value)
non_zero = flat[flat > 0]
threshold = float(non_zero.min() / 2) if len(non_zero) > 0 else 2.0
min_nz = f"{non_zero.min():.1f}" if len(non_zero) else "N/A"
print(f"\nThreshold: {threshold:.2f}  (min non-zero: {min_nz})")

# ── Build answer key ──────────────────────────────────────────────────────────
answer_key: dict[str, list[int]] = {}
debug_img = img.copy() if DEBUG else None

for r in range(14):
    y1, y2 = row_bounds[r]
    hit_cols = [c+1 for c in range(47) if densities[r, c] > threshold]
    answer_key[str(r+1)] = hit_cols
    print(f"  Row {r+1:2d}: {len(hit_cols):2d} targets → {hit_cols}")
    if DEBUG and debug_img is not None:
        for c in range(47):
            cx = col_centers[c]
            x1, x2 = cx - col_w//2, cx + col_w//2
            color = (0, 200, 0) if densities[r,c] > threshold else (200, 200, 200)
            cv2.rectangle(debug_img, (x1, y1), (x2, y2), color, 1)

if DEBUG and debug_img is not None:
    out_path = BASE / "scripts" / "debug_grid.png"
    cv2.imwrite(str(out_path), debug_img)
    print(f"\nDebug image → {out_path}")

total = sum(len(v) for v in answer_key.values())
print(f"\nTotal target items: {total}")
with open(OUT_PATH, "w") as f:
    json.dump(answer_key, f, indent=2)
print(f"Written to {OUT_PATH}")
