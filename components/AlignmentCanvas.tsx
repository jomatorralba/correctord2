"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Point } from "@/lib/homography";

interface Props {
  imageSrc: string;
  onConfirm: (corners: Point[]) => void; // [TL, TR, BL, BR] in photo-space
}

const HANDLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];
const HANDLE_LABELS = ["TL", "TR", "BL", "BR"];

export default function AlignmentCanvas({ imageSrc, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalW, setNaturalW] = useState(1);
  const [naturalH, setNaturalH] = useState(1);
  // Corners in CANVAS display coordinates (will be scaled to natural photo coords on confirm)
  const [handles, setHandles] = useState<Point[]>([[0, 0], [0, 0], [0, 0], [0, 0]]);
  const [dragging, setDragging] = useState<number | null>(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Initialise handles when canvas size is known
  const initHandles = useCallback((w: number, h: number) => {
    const m = Math.min(w, h) * 0.12;
    setHandles([
      [m, m],
      [w - m, m],
      [m, h - m],
      [w - m, h - m],
    ]);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = cw;
    canvas.height = ch;

    // Scale image to fit canvas while keeping aspect ratio
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    scaleRef.current = scale;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);

    // Draw quad
    ctx.beginPath();
    ctx.moveTo(handles[0][0], handles[0][1]);
    ctx.lineTo(handles[1][0], handles[1][1]);
    ctx.lineTo(handles[3][0], handles[3][1]);
    ctx.lineTo(handles[2][0], handles[2][1]);
    ctx.closePath();
    ctx.strokeStyle = "rgba(59,130,246,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(59,130,246,0.08)";
    ctx.fill();

    // Draw handles
    handles.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = HANDLE_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(HANDLE_LABELS[i], x, y);
    });
  }, [handles]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasPoint = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  const findClosestHandle = (p: Point): number => {
    let best = -1, bestDist = Infinity;
    handles.forEach(([hx, hy], i) => {
      const d = Math.hypot(p[0] - hx, p[1] - hy);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return bestDist < 40 ? best : -1;
  };

  const onPointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    const p = getCanvasPoint(e);
    const idx = findClosestHandle(p);
    if (idx >= 0) setDragging(idx);
  };

  const onPointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragging === null) return;
    e.preventDefault();
    const p = getCanvasPoint(e);
    setHandles(prev => prev.map((h, i) => i === dragging ? p : h) as Point[]);
  };

  const onPointerUp = () => setDragging(null);

  const handleConfirm = () => {
    // Convert canvas display coords → natural image coords
    const canvas = canvasRef.current!;
    const img = imgRef.current!;
    const scale = scaleRef.current;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    const naturalCorners: Point[] = handles.map(([cx, cy]) => [
      (cx - dx) / scale,
      (cy - dy) / scale,
    ]);
    onConfirm(naturalCorners);
  };

  // Init handles once canvas is known
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      initHandles(canvas.clientWidth, canvas.clientHeight);
    });
    observer.observe(canvas);
    initHandles(canvas.clientWidth || 300, canvas.clientHeight || 200);
    return () => observer.disconnect();
  }, [initHandles]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-sm text-slate-500 text-center px-2">
        Arrastra los 4 puntos hasta los marcadores impresos en las esquinas de la hoja
      </p>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl touch-none"
        style={{ height: "60vh", background: "#1e293b" }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
      <div className="flex gap-2 text-xs text-slate-500 justify-center">
        {HANDLE_LABELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: HANDLE_COLORS[i] }} />
            {l}
          </span>
        ))}
      </div>
      <button
        onClick={handleConfirm}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl px-6 py-4 text-base transition-colors"
      >
        Corregir prueba
      </button>
    </div>
  );
}
