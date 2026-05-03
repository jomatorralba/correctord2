import { applyH, type Point } from './homography';

// Detect if a cell in canvas-space has a crossed-out item in the photo.
// H_inv maps canvas-space → photo-space (inverse of the photo→canvas homography).
// Uses dark-pixel density across a grid of samples — works for diagonal slashes,
// horizontal strikethroughs, and X marks regardless of stroke direction.
export function isCrossed(
  pixels: Uint8ClampedArray,
  imgW: number,
  H_inv: number[][],
  cx: number,   // column center x in canvas-space
  y1: number,   // cell top y
  y2: number,   // cell bottom y
  halfW: number // half cell width
): boolean {
  const x1 = cx - halfW * 0.9;
  const x2 = cx + halfW * 0.9;
  const top = y1 + (y2 - y1) * 0.1;
  const bot = y2 - (y2 - y1) * 0.1;
  const VSTEPS = 9;
  const HSTEPS = 9;
  const GRAY_THRESHOLD = 140; // catches pencil and ballpoint pen, not just markers

  let darkCount = 0;
  let totalCount = 0;

  for (let vs = 0; vs < VSTEPS; vs++) {
    const canY = top + (bot - top) * (vs / (VSTEPS - 1));
    for (let hs = 0; hs < HSTEPS; hs++) {
      const canX = x1 + (x2 - x1) * (hs / (HSTEPS - 1));
      const [px, py] = applyH(H_inv, canX, canY);
      const ix = Math.round(px);
      const iy = Math.round(py);
      if (!isFinite(px) || !isFinite(py) || ix < 0 || iy < 0 || ix >= imgW || iy * imgW + ix >= pixels.length / 4) continue;
      totalCount++;
      const idx = (iy * imgW + ix) * 4;
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      if (gray < GRAY_THRESHOLD) darkCount++;
    }
  }

  if (totalCount === 0) return false;
  // A diagonal slash covers ~10-15% of the cell; uncrossed letters cover <6%
  return darkCount / totalCount > 0.08;
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
