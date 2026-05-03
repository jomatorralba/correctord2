import { applyH, type Point } from './homography';

// Detect if a cell in canvas-space has a crossed-out item in the photo.
// H_inv maps canvas-space → photo-space (inverse of the photo→canvas homography).
export function isCrossed(
  pixels: Uint8ClampedArray,
  imgW: number,
  H_inv: number[][],
  cx: number,   // column center x in canvas-space
  y1: number,   // cell top y
  y2: number,   // cell bottom y
  halfW: number // half cell width
): boolean {
  const x1 = cx - halfW;
  const x2 = cx + halfW;
  const midY = (y1 + y2) / 2;
  const vSpan = (y2 - y1) * 0.3;
  const VSTEPS = 7;   // vertical scan lines
  const HSTEPS = 32;  // horizontal samples per line

  let maxRun = 0;

  for (let vs = 0; vs < VSTEPS; vs++) {
    const canY = midY + (vs / (VSTEPS - 1) - 0.5) * 2 * vSpan;
    let run = 0;
    let rowMax = 0;

    for (let hs = 0; hs <= HSTEPS; hs++) {
      const canX = x1 + (x2 - x1) * (hs / HSTEPS);
      const [px, py] = applyH(H_inv, canX, canY);
      const ix = Math.round(px);
      const iy = Math.round(py);
      if (!isFinite(px) || !isFinite(py) || ix < 0 || iy < 0 || ix >= imgW || iy * imgW + ix >= pixels.length / 4) {
        run = 0;
        continue;
      }
      const idx = (iy * imgW + ix) * 4;
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      if (gray < 110) {
        run++;
        rowMax = Math.max(rowMax, run);
      } else {
        run = 0;
      }
    }
    maxRun = Math.max(maxRun, rowMax);
  }

  // Crossed if dark run spans > 38% of horizontal samples (= a clear line)
  return maxRun >= HSTEPS * 0.38;
}

// Build a per-cell result matrix (14 rows × 47 cols)
export function detectAllCells(
  pixels: Uint8ClampedArray,
  imgW: number,
  H_inv: number[][],
  colCenters: number[],
  rowBounds: [number, number][],
  colHalfW: number
): boolean[][] {
  return rowBounds.map(([y1, y2]) =>
    colCenters.map(cx => isCrossed(pixels, imgW, H_inv, cx, y1, y2, colHalfW))
  );
}
