export type Point = [number, number];

function gaussElim(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    x[r] = M[r][n] / M[r][r];
    for (let k = 0; k < r; k++) M[k][n] -= M[k][r] * x[r];
  }
  return x;
}

// 4-point homography: src[i] → dst[i]  (returns 3×3 matrix)
export function computeH(src: Point[], dst: Point[]): number[][] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [X, Y] = dst[i];
    A.push([-x, -y, -1, 0, 0, 0, X * x, X * y]);
    b.push(-X);
    A.push([0, 0, 0, -x, -y, -1, Y * x, Y * y]);
    b.push(-Y);
  }
  const h = gaussElim(A, b);
  h.push(1);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], h[8]]];
}

export function applyH(H: number[][], x: number, y: number): Point {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(w) < 1e-9) return [Infinity, Infinity];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w,
          (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

export function invertH(H: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, k]] = H;
  const det = a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
  return [
    [(e * k - f * h) / det, (c * h - b * k) / det, (b * f - c * e) / det],
    [(f * g - d * k) / det, (a * k - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
}
