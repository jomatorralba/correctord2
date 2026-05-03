"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { computeH, invertH, type Point } from "@/lib/homography";
import { detectAllCells } from "@/lib/crossDetect";
import { computeScore, type D2Score } from "@/lib/score";
import type { GridConfig } from "@/lib/gridConfig";
import ScoreCard from "@/components/ScoreCard";

const AlignmentCanvas = dynamic(() => import("@/components/AlignmentCanvas"), { ssr: false });

type Phase = "idle" | "align" | "processing" | "done" | "error";

// Reference corners in canvas-space: [TL, TR, BL, BR]
// Loaded from /grid-config.json
let _gridConfig: GridConfig | null = null;
async function loadGridConfig(): Promise<GridConfig> {
  if (_gridConfig) return _gridConfig;
  const res = await fetch("/grid-config.json");
  _gridConfig = await res.json();
  return _gridConfig!;
}

export default function CorregirPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [score, setScore] = useState<D2Score | null>(null);
  const [crossed, setCrossed] = useState<boolean[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setPhase("align");
    setScore(null);
    setCrossed(null);
  }, []);

  const handleConfirmAlignment = useCallback(async (corners: Point[]) => {
    if (!imageSrc) return;
    setPhase("processing");
    try {
      const cfg = await loadGridConfig();
      const answerKey: Record<string, number[]> = await fetch("/answer-key.json").then(r => r.json());

      // Reference corners from grid-config (canvas-space)
      // Order provided by AlignmentCanvas: [TL, TR, BL, BR]
      const refCorners: Point[] = [
        cfg.markerCenters["0"] as Point,
        cfg.markerCenters["1"] as Point,
        cfg.markerCenters["2"] as Point,
        cfg.markerCenters["3"] as Point,
      ];

      // H maps photo-space → canvas-space
      const H = computeH(corners, refCorners);
      // H_inv maps canvas-space → photo-space (for backward sampling)
      const H_inv = invertH(H);

      // Load photo pixels using a regular canvas (safe for iOS/Safari)
      const img = await loadImage(imageSrc);
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.naturalWidth;
      tmpCanvas.height = img.naturalHeight;
      const ctx = tmpCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const { data, width } = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      const rowBounds = cfg.rowBounds as [number, number][];
      const crossedMatrix = detectAllCells(data, width, H_inv, cfg.colCenters, rowBounds, cfg.colW / 2);

      const scoreResult = computeScore(crossedMatrix, answerKey);
      setCrossed(crossedMatrix);
      setScore(scoreResult);
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
    setScore(null);
    setCrossed(null);
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

        {/* ── IDLE: upload photo ── */}
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

        {/* ── ALIGN: drag corners ── */}
        {phase === "align" && imageSrc && (
          <div className="w-full max-w-lg">
            <AlignmentCanvas imageSrc={imageSrc} onConfirm={handleConfirmAlignment} />
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div className="flex flex-col items-center gap-4 flex-1 justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-slate-500">Analizando respuestas…</p>
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

        {/* ── DONE: results ── */}
        {phase === "done" && score && imageSrc && crossed && (
          <div className="flex flex-col gap-5 w-full max-w-lg">
            <ResultsOverlayInline imageSrc={imageSrc} crossed={crossed} />
            <ScoreCard score={score} />
            <button onClick={reset} className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-2xl px-6 py-4 transition-colors hover:bg-slate-50">
              Corregir otra prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Lightweight inline overlay: just shows the photo + a legend
function ResultsOverlayInline({ imageSrc, crossed }: { imageSrc: string; crossed: boolean[][] }) {
  const totalCrossed = crossed.flat().filter(Boolean).length;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt="Prueba corregida" className="w-full h-auto" />
      <div className="px-3 py-2 text-xs text-slate-500 text-center">
        {totalCrossed} elementos marcados detectados
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
