"use client";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Point } from "@/lib/homography";

const AlignmentCanvas = dynamic(() => import("@/components/AlignmentCanvas"), { ssr: false });

type Phase = "idle" | "align" | "done";

type Base = {
  cx: number; cy: number;
  scaleBase: number;
  angle: number;
  tw: number; th: number;
};

function computeBase(corners: Point[], displayScale: number, tw: number, th: number): Base {
  const [TL, TR, BL, BR] = corners.map(([x, y]): [number, number] => [x * displayScale, y * displayScale]);
  const cx = (TL[0] + TR[0] + BL[0] + BR[0]) / 4;
  const cy = (TL[1] + TR[1] + BL[1] + BR[1]) / 4;
  const markerW = (Math.hypot(TR[0] - TL[0], TR[1] - TL[1]) + Math.hypot(BR[0] - BL[0], BR[1] - BL[1])) / 2;
  const angle = Math.atan2(TR[1] - TL[1], TR[0] - TL[0]) * (180 / Math.PI);
  // Markers span ~94% of the canvas width → scale up slightly to cover full page
  return { cx, cy, scaleBase: (markerW / tw) * (1 / 0.9375), angle, tw, th };
}

export default function CorregirPage() {
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [imageSrc,     setImageSrc]     = useState<string | null>(null);
  const [savedCorners, setSavedCorners] = useState<Point[] | null>(null);
  const [base,         setBase]         = useState<Base | null>(null);
  const [photoLoaded,  setPhotoLoaded]  = useState(false);
  // Fine-tune controls
  const [offsetX,  setOffsetX]  = useState(0);
  const [offsetY,  setOffsetY]  = useState(0);
  const [wAdj,     setWAdj]     = useState(100); // % of base scale
  const [hAdj,     setHAdj]     = useState(100);
  const [rotAdj,   setRotAdj]   = useState(0);   // degrees added to auto-angle
  const [opacity,  setOpacity]  = useState(60);
  const [showTemplate, setShowTemplate] = useState(true);

  const photoRef = useRef<HTMLImageElement | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const drag     = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageSrc(URL.createObjectURL(f));
    setBase(null); setPhotoLoaded(false); resetAdjust();
    setPhase("align");
  };

  const resetAdjust = () => {
    setOffsetX(0); setOffsetY(0);
    setWAdj(100); setHAdj(100); setRotAdj(0);
  };

  const handleConfirmAlignment = useCallback((corners: Point[]) => {
    setSavedCorners(corners);
    setBase(null); setPhotoLoaded(false); resetAdjust();
    setPhase("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPhotoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    photoRef.current = e.currentTarget;
    setPhotoLoaded(true);
  };

  const onTemplateLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const photo = photoRef.current;
    if (!photo?.naturalWidth || !savedCorners) return;
    const s = photo.clientWidth / photo.naturalWidth;
    const { naturalWidth: tw, naturalHeight: th } = e.currentTarget;
    setBase(computeBase(savedCorners, s, tw, th));
  }, [savedCorners]);

  // ── drag ──────────────────────────────────────────────────────────────
  const onMouseDown  = (e: React.MouseEvent) => { drag.current = { on: true, sx: e.clientX, sy: e.clientY, ox: offsetX, oy: offsetY }; e.preventDefault(); };
  const onMouseMove  = (e: React.MouseEvent) => { if (!drag.current.on) return; setOffsetX(drag.current.ox + e.clientX - drag.current.sx); setOffsetY(drag.current.oy + e.clientY - drag.current.sy); };
  const onMouseUp    = () => { drag.current.on = false; };
  const onTouchStart = (e: React.TouchEvent) => { if (e.touches.length !== 1) return; drag.current = { on: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: offsetX, oy: offsetY }; };
  const onTouchMove  = (e: React.TouchEvent) => { if (!drag.current.on || e.touches.length !== 1) return; e.preventDefault(); setOffsetX(drag.current.ox + e.touches[0].clientX - drag.current.sx); setOffsetY(drag.current.oy + e.touches[0].clientY - drag.current.sy); };
  const onTouchEnd   = () => { drag.current.on = false; };

  const reset = () => {
    setPhase("idle"); setImageSrc(null); setSavedCorners(null);
    setBase(null); setPhotoLoaded(false); resetAdjust();
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── idle ──────────────────────────────────────────────────────────────
  if (phase === "idle") return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
        <Link href="/" className="text-slate-500 hover:text-slate-700"><BackArrow /></Link>
        <h1 className="font-semibold text-slate-800">Corregir prueba d2</h1>
      </header>
      <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto flex-1 justify-center px-4">
        <div className="text-center">
          <p className="text-slate-600 font-medium mb-1">Carga una foto de la prueba rellena</p>
          <p className="text-slate-400 text-sm">Marcarás las 4 esquinas y la plantilla se posicionará automáticamente</p>
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

  // ── align ─────────────────────────────────────────────────────────────
  if (phase === "align" && imageSrc) return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
        <button onClick={reset} className="text-slate-500 hover:text-slate-700"><BackArrow /></button>
        <h1 className="font-semibold text-slate-800">Marcar las 4 esquinas</h1>
      </header>
      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        <AlignmentCanvas imageSrc={imageSrc} onConfirm={handleConfirmAlignment} />
      </div>
    </div>
  );

  // ── done ──────────────────────────────────────────────────────────────
  const sx = base ? base.scaleBase * wAdj / 100 : 1;
  const sy = base ? base.scaleBase * hAdj / 100 : 1;
  const angle = base ? base.angle + rotAdj : rotAdj;
  const templateTransform = base
    ? `translate(${base.cx + offsetX - base.tw / 2}px, ${base.cy + offsetY - base.th / 2}px) rotate(${angle}deg) scale(${sx}, ${sy})`
    : "none";

  return (
    <div className="flex flex-col min-h-screen" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

      {/* ── toolbar row 1 ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100 flex-wrap">
        <button onClick={reset} className="text-slate-500 p-1 shrink-0"><BackArrow /></button>

        <button
          onClick={() => setShowTemplate(v => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
            showTemplate ? "bg-green-100 text-green-700 border-green-300" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {showTemplate ? "Plantilla ✓" : "Plantilla —"}
        </button>

        <button onClick={resetAdjust} className="text-[11px] text-slate-400 px-2 py-1 border border-slate-200 rounded shrink-0 hover:bg-slate-50">
          Reset
        </button>
        <button onClick={() => setPhase("align")} className="text-[11px] text-slate-500 px-3 py-1.5 border border-slate-200 rounded-full shrink-0 hover:bg-slate-50">
          Reajustar esquinas
        </button>
      </div>

      {/* ── toolbar row 2: sliders ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2 bg-white border-b border-slate-200 sm:flex sm:flex-wrap sm:gap-x-6">
        <SliderRow label="Ancho"    min={20}  max={300} value={wAdj}   onChange={setWAdj}   suffix="%" />
        <SliderRow label="Alto"     min={20}  max={300} value={hAdj}   onChange={setHAdj}   suffix="%" />
        <SliderRow label="Rotación" min={-45} max={45}  value={rotAdj} onChange={setRotAdj} suffix="°" />
        <SliderRow label="Opacidad" min={10}  max={90}  value={opacity} onChange={setOpacity} suffix="%" />
      </div>

      <p className="text-center text-[11px] text-slate-400 py-1 shrink-0">
        Arrastra la plantilla para ajustar posición
      </p>

      {/* ── photo + overlay ── */}
      <div className="max-w-5xl mx-auto w-full px-2 pb-8">
        <div className="relative inline-block w-full overflow-hidden rounded-lg">

          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img ref={photoRef} src={imageSrc} alt="Prueba" className="w-full h-auto block" onLoad={onPhotoLoad} />
          )}

          {showTemplate && photoLoaded && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/plantilla-correccion.png"
              alt="Plantilla de corrección"
              draggable={false}
              onLoad={onTemplateLoad}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                position: "absolute", top: 0, left: 0,
                width: base ? `${base.tw}px` : "auto",
                height: base ? `${base.th}px` : "auto",
                transformOrigin: "center center",
                transform: templateTransform,
                opacity: base ? opacity / 100 : 0,
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, min, max, value, onChange, suffix = "" }: {
  label: string; min: number; max: number; value: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-500 w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-28 sm:w-36" />
      <span className="text-[11px] text-slate-500 w-9 shrink-0 text-right">{value}{suffix}</span>
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
