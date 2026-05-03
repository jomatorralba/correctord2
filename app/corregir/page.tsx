"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { computeH, invertH, applyH, type Point } from "@/lib/homography";
import type { GridConfig } from "@/lib/gridConfig";

const AlignmentCanvas = dynamic(() => import("@/components/AlignmentCanvas"), { ssr: false });

type Phase = "idle" | "align" | "done";
type Poly  = { pts: string; k: string };

// module-level cache so we fetch once
let _cfg: GridConfig | null = null;
let _key: Record<string, number[]> | null = null;
async function loadAssets() {
  if (!_cfg) _cfg = await fetch("/grid-config.json").then(r => r.json());
  if (!_key) _key = await fetch("/answer-key.json").then(r => r.json());
  return { cfg: _cfg!, key: _key! };
}

// For each target cell, project its 4 canvas-space corners into photo screen-space.
// Result: one SVG polygon per target cell, correctly warped for the photo's perspective.
function buildPolygons(H_inv: number[][], scale: number, cfg: GridConfig, key: Record<string, number[]>): Poly[] {
  const hw = cfg.colW / 2;
  const polys: Poly[] = [];
  for (let ri = 0; ri < cfg.rowBounds.length; ri++) {
    const [y1, y2] = cfg.rowBounds[ri];
    const targets = new Set(key[String(ri + 1)] ?? []);
    for (let ci = 0; ci < cfg.colCenters.length; ci++) {
      if (!targets.has(ci + 1)) continue;
      const cx = cfg.colCenters[ci];
      const pts = [
        [cx - hw, y1], [cx + hw, y1],
        [cx + hw, y2], [cx - hw, y2],
      ].map(([x, y]) => {
        const [px, py] = applyH(H_inv, x, y);
        return `${(px * scale).toFixed(1)},${(py * scale).toFixed(1)}`;
      }).join(" ");
      polys.push({ pts, k: `${ri}-${ci}` });
    }
  }
  return polys;
}

export default function CorregirPage() {
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [imageSrc,   setImageSrc]   = useState<string | null>(null);
  const [polygons,   setPolygons]   = useState<Poly[] | null>(null);
  const [svgSize,    setSvgSize]    = useState<{ w: number; h: number } | null>(null);
  const [showOverlay,setShowOverlay]= useState(true);
  const [opacity,    setOpacity]    = useState(60);
  const hInvRef = useRef<number[][] | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const recompute = useCallback(() => {
    const img = photoRef.current;
    if (!img || !img.naturalWidth || !hInvRef.current || !_cfg || !_key) return;
    const scale = img.clientWidth / img.naturalWidth;
    setSvgSize({ w: img.clientWidth, h: img.clientHeight });
    setPolygons(buildPolygons(hInvRef.current, scale, _cfg, _key));
  }, []);

  // Recompute whenever the window is resized (desktop resize)
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSrc(URL.createObjectURL(file));
    setPolygons(null);
    setSvgSize(null);
    setPhase("align");
  };

  const handleConfirmAlignment = useCallback(async (corners: Point[]) => {
    const { cfg, key } = await loadAssets();
    const refCorners: Point[] = [
      cfg.markerCenters["0"] as Point,
      cfg.markerCenters["1"] as Point,
      cfg.markerCenters["2"] as Point,
      cfg.markerCenters["3"] as Point,
    ];
    const H = computeH(corners, refCorners);
    hInvRef.current = invertH(H);
    setPhase("done");
  }, []);

  const onPhotoLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    photoRef.current = e.currentTarget;
    recompute();
  }, [recompute]);

  const reset = () => {
    setPhase("idle");
    setImageSrc(null);
    setPolygons(null);
    setSvgSize(null);
    hInvRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── IDLE ──────────────────────────────────────────────────────────────
  if (phase === "idle") return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
        <Link href="/" className="text-slate-500 hover:text-slate-700"><BackArrow /></Link>
        <h1 className="font-semibold text-slate-800">Corregir prueba d2</h1>
      </header>
      <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto flex-1 justify-center px-4">
        <div className="text-center">
          <p className="text-slate-600 font-medium mb-1">Carga una foto de la prueba rellena</p>
          <p className="text-slate-400 text-sm">Marcarás las 4 esquinas y la plantilla se colocará automáticamente</p>
        </div>
        <label className="flex flex-col items-center justify-center gap-3 w-full h-40 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
          <CameraIcon className="w-10 h-10 text-blue-400" />
          <span className="text-blue-600 font-semibold">Seleccionar foto</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        <p className="text-xs text-slate-400 text-center">
          ¿No tienes la prueba impresa?{" "}
          <Link href="/imprimir" className="text-blue-500 underline">Imprímela aquí</Link>
        </p>
      </div>
    </div>
  );

  // ── ALIGN ─────────────────────────────────────────────────────────────
  if (phase === "align" && imageSrc) return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
        <button onClick={reset} className="text-slate-500 hover:text-slate-700"><BackArrow /></button>
        <h1 className="font-semibold text-slate-800">Ajustar esquinas</h1>
      </header>
      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        <AlignmentCanvas imageSrc={imageSrc} onConfirm={handleConfirmAlignment} />
      </div>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white flex-wrap gap-y-2">
        <button onClick={reset} className="text-slate-500 p-1 shrink-0"><BackArrow /></button>

        <button
          onClick={() => setShowOverlay(v => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
            showOverlay ? "bg-green-100 text-green-700 border-green-300" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {showOverlay ? "Plantilla ✓" : "Plantilla —"}
        </button>

        <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
          <span className="text-[11px] text-slate-400 shrink-0">Opacidad</span>
          <input type="range" min={10} max={90} value={opacity}
            onChange={e => setOpacity(+e.target.value)} className="flex-1" />
          <span className="text-[11px] text-slate-400 w-6">{opacity}%</span>
        </div>

        <button
          onClick={() => setPhase("align")}
          className="text-xs text-slate-500 px-3 py-1.5 border border-slate-200 rounded-full shrink-0 hover:bg-slate-50"
        >
          Reajustar esquinas
        </button>
      </header>

      <p className="text-center text-xs text-slate-400 py-1.5">
        Verde = respuesta correcta · Usa el zoom del navegador para acercar cada línea
      </p>

      {/* Photo + auto-aligned overlay */}
      <div className="max-w-5xl mx-auto w-full px-2 pb-6">
        <div className="relative inline-block w-full">
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={photoRef}
              src={imageSrc}
              alt="Prueba"
              className="w-full h-auto block rounded-lg"
              onLoad={onPhotoLoad}
            />
          )}

          {showOverlay && polygons && svgSize && (
            <svg
              width={svgSize.w}
              height={svgSize.h}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ opacity: opacity / 100 }}
            >
              {polygons.map(({ pts, k }) => (
                <polygon
                  key={k}
                  points={pts}
                  fill="rgba(34,197,94,0.4)"
                  stroke="rgb(22,163,74)"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
          )}
        </div>
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
