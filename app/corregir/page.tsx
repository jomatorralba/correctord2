"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { computeH, invertH, applyH, type Point } from "@/lib/homography";
import type { GridConfig } from "@/lib/gridConfig";

const AlignmentCanvas = dynamic(() => import("@/components/AlignmentCanvas"), { ssr: false });

type Phase = "idle" | "align" | "processing" | "done" | "error";

let _gridConfig: GridConfig | null = null;
async function loadGridConfig(): Promise<GridConfig> {
  if (_gridConfig) return _gridConfig;
  const res = await fetch("/grid-config.json");
  _gridConfig = await res.json();
  return _gridConfig!;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function CorregirPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setPhase("align");
    setOverlaySrc(null);
  }, []);

  const handleConfirmAlignment = useCallback(async (corners: Point[]) => {
    if (!imageSrc) return;
    setPhase("processing");
    try {
      const cfg = await loadGridConfig();
      const answerKey: Record<string, number[]> = await fetch("/answer-key.json").then(r => r.json());

      const refCorners: Point[] = [
        cfg.markerCenters["0"] as Point,
        cfg.markerCenters["1"] as Point,
        cfg.markerCenters["2"] as Point,
        cfg.markerCenters["3"] as Point,
      ];

      // H maps photo-space → canvas-space; H_inv maps canvas-space → photo-space
      const H = computeH(corners, refCorners);
      const H_inv = invertH(H);

      // Load photo pixels
      const img = await loadImage(imageSrc);
      const photoW = img.naturalWidth;
      const photoH = img.naturalHeight;
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = photoW;
      tmpCanvas.height = photoH;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.drawImage(img, 0, 0);
      const photoData = tmpCtx.getImageData(0, 0, photoW, photoH).data;

      // Output canvas at half canvas-space resolution
      const scale = 0.5;
      const outW = Math.round(cfg.canvasW * scale);
      const outH = Math.round(cfg.canvasH * scale);
      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext("2d")!;

      // Backward warp: for each output pixel, sample from photo via H_inv
      const outData = outCtx.createImageData(outW, outH);
      for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
          const canX = ox / scale;
          const canY = oy / scale;
          const [px, py] = applyH(H_inv, canX, canY);
          const ix = Math.round(px);
          const iy = Math.round(py);
          if (!isFinite(px) || !isFinite(py) || ix < 0 || iy < 0 || ix >= photoW || iy >= photoH) continue;
          const si = (iy * photoW + ix) * 4;
          const di = (oy * outW + ox) * 4;
          outData.data[di]     = photoData[si];
          outData.data[di + 1] = photoData[si + 1];
          outData.data[di + 2] = photoData[si + 2];
          outData.data[di + 3] = 255;
        }
      }
      outCtx.putImageData(outData, 0, 0);

      // Overlay answer-key boxes in green
      const rowBounds = cfg.rowBounds as [number, number][];
      const colCenters = cfg.colCenters as number[];
      const halfW = cfg.colW / 2;
      outCtx.globalAlpha = 0.4;
      outCtx.fillStyle = "#22c55e";
      for (let rowIdx = 0; rowIdx < rowBounds.length; rowIdx++) {
        const [y1, y2] = rowBounds[rowIdx];
        const targets = new Set(answerKey[String(rowIdx + 1)] ?? []);
        for (let colIdx = 0; colIdx < colCenters.length; colIdx++) {
          if (!targets.has(colIdx + 1)) continue;
          const cx = colCenters[colIdx];
          outCtx.fillRect(
            (cx - halfW) * scale, y1 * scale,
            cfg.colW * scale, (y2 - y1) * scale
          );
        }
      }
      outCtx.globalAlpha = 1;

      setOverlaySrc(outCanvas.toDataURL("image/jpeg", 0.88));
      setPhase("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }, [imageSrc]);

  const reset = () => {
    setPhase("idle");
    setImageSrc(null);
    setOverlaySrc(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
        {phase === "idle" ? (
          <Link href="/" className="text-slate-500 hover:text-slate-700"><BackArrow /></Link>
        ) : (
          <button onClick={reset} className="text-slate-500 hover:text-slate-700"><BackArrow /></button>
        )}
        <h1 className="font-semibold text-slate-800">Corregir prueba d2</h1>
        {phase === "processing" && (
          <span className="ml-auto text-sm text-blue-500 animate-pulse">Procesando…</span>
        )}
      </header>

      <div className="flex flex-col items-center gap-5 px-4 py-6 flex-1">

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm flex-1 justify-center">
            <div className="text-center">
              <p className="text-slate-600 font-medium mb-1">Fotografía la prueba rellena</p>
              <p className="text-slate-400 text-sm">Asegúrate de que los 4 marcadores de las esquinas sean visibles</p>
            </div>
            <label className="flex flex-col items-center justify-center gap-3 w-full h-40 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
              <CameraIcon className="w-10 h-10 text-blue-400" />
              <span className="text-blue-600 font-semibold">Hacer foto / Cargar imagen</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            <p className="text-xs text-slate-400 text-center">
              ¿No tienes la prueba impresa?{" "}
              <Link href="/imprimir" className="text-blue-500 underline">Imprímela aquí</Link>
            </p>
          </div>
        )}

        {/* ── ALIGN ── */}
        {phase === "align" && imageSrc && (
          <div className="w-full max-w-lg">
            <AlignmentCanvas imageSrc={imageSrc} onConfirm={handleConfirmAlignment} />
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div className="flex flex-col items-center gap-4 flex-1 justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-slate-500">Rectificando imagen…</p>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 flex-1 justify-center w-full max-w-sm">
            <div className="text-5xl">⚠️</div>
            <p className="text-red-600 font-medium text-center">{error || "Error desconocido"}</p>
            <button onClick={reset} className="bg-blue-600 text-white rounded-2xl px-6 py-3 font-semibold">
              Volver a intentar
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && overlaySrc && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-400 opacity-80" />
              <span>Verde = respuesta correcta. Haz zoom para revisar cada línea.</span>
            </div>
            <div className="rounded-xl overflow-auto border border-slate-200 shadow bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={overlaySrc}
                alt="Prueba rectificada con plantilla"
                className="w-full h-auto"
                style={{ touchAction: "pinch-zoom" }}
              />
            </div>
            <button
              onClick={reset}
              className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-2xl px-6 py-4 hover:bg-slate-50"
            >
              Corregir otra prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BackArrow() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
