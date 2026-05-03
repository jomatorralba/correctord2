"use client";
import { useState, useRef } from "react";
import Link from "next/link";

type TF = { x: number; y: number; scale: number };

export default function CorregirPage() {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(true);
  const [opacity, setOpacity] = useState(55);
  const [tf, setTf] = useState<TF>({ x: 0, y: 0, scale: 1 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Drag / pinch state — kept in a ref so we never stale-close over it
  const g = useRef({ dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, pinchDist: 0 });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSrc(URL.createObjectURL(file));
    setTf({ x: 0, y: 0, scale: 1 });
  };

  // ── Mouse ──────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    g.current.dragging = true;
    g.current.sx = e.clientX; g.current.sy = e.clientY;
    g.current.ox = tf.x;     g.current.oy = tf.y;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!g.current.dragging) return;
    setTf(t => ({ ...t, x: g.current.ox + e.clientX - g.current.sx, y: g.current.oy + e.clientY - g.current.sy }));
  };
  const onMouseUp = () => { g.current.dragging = false; };

  // ── Touch ──────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      g.current.dragging = false;
      g.current.pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    } else {
      g.current.dragging = true;
      g.current.sx = e.touches[0].clientX; g.current.sy = e.touches[0].clientY;
      g.current.ox = tf.x;                 g.current.oy = tf.y;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = g.current.pinchDist > 0 ? d / g.current.pinchDist : 1;
      setTf(t => ({ ...t, scale: Math.max(0.2, Math.min(5, t.scale * ratio)) }));
      g.current.pinchDist = d;
    } else if (g.current.dragging) {
      setTf(t => ({
        ...t,
        x: g.current.ox + e.touches[0].clientX - g.current.sx,
        y: g.current.oy + e.touches[0].clientY - g.current.sy,
      }));
    }
  };
  const onTouchEnd = () => { g.current.dragging = false; };

  // ── Upload screen ──────────────────────────────────────────────────────
  if (!photoSrc) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
          <Link href="/" className="text-slate-500 hover:text-slate-700"><BackArrow /></Link>
          <h1 className="font-semibold text-slate-800">Corregir prueba d2</h1>
        </header>
        <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto flex-1 justify-center px-4">
          <div className="text-center">
            <p className="text-slate-600 font-medium mb-1">Carga una foto de la prueba rellena</p>
            <p className="text-slate-400 text-sm">Luego arrastra la plantilla encima para corregir</p>
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
  }

  // ── Viewer ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-dvh bg-black select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => setPhotoSrc(null)} className="text-slate-500 p-1 shrink-0">
          <BackArrow />
        </button>

        <button
          onClick={() => setShowTemplate(v => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
            showTemplate
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {showTemplate ? "Plantilla ✓" : "Plantilla —"}
        </button>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] text-slate-400 shrink-0">Opacidad</span>
          <input
            type="range" min={10} max={90} value={opacity}
            onChange={e => setOpacity(+e.target.value)}
            className="flex-1"
          />
          <span className="text-[11px] text-slate-400 w-6 shrink-0">{opacity}%</span>
        </div>

        <button
          onClick={() => setTf({ x: 0, y: 0, scale: 1 })}
          className="text-[11px] text-slate-400 px-2 py-1 border border-slate-200 rounded shrink-0"
        >
          Reset
        </button>
      </div>

      <p className="text-center text-[11px] text-white/40 py-1 shrink-0">
        Arrastra la plantilla · Pellizca para escalar
      </p>

      {/* Photo + overlay */}
      <div
        className="relative flex-1 overflow-hidden"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt="Prueba"
          className="w-full h-full object-contain pointer-events-none"
        />

        {showTemplate && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/plantilla-correccion.png"
            alt="Plantilla"
            draggable={false}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing touch-none"
            style={{
              opacity: opacity / 100,
              transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
              transformOrigin: "center center",
            }}
          />
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
