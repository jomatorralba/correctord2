export interface GridConfig {
  canvasW: number;
  canvasH: number;
  testOffsetX: number;
  testOffsetY: number;
  testW: number;
  testH: number;
  colCenters: number[];   // x centers in canvas-space
  colW: number;
  rowBounds: [number, number][]; // [y1, y2] in canvas-space for each of 14 rows
  markerSize: number;
  markerCenters: Record<string, [number, number]>; // marker ID → [cx, cy]
}

// Reference corner positions (centers of the 4 ArUco markers) in canvas-space.
// Order: [top-left, top-right, bottom-left, bottom-right]
export function getRefCorners(cfg: GridConfig): [number, number][] {
  return [
    cfg.markerCenters['0'],
    cfg.markerCenters['1'],
    cfg.markerCenters['2'],
    cfg.markerCenters['3'],
  ];
}
