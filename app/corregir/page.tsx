"use client";
import { useState, useRef } from "react";
import Link from "next/link";

type TF = { x: number; y: number; scale: number; rotation: number };
type Mode = "ver" | "ajustar";

const INIT_TF: TF = { x: 0, y: 0, scale: 1, rotation: 0 };

export default function CorregirPage() {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(true);
  const [opacity, setOpacity] = useState(55);
  const [mode, setMode] = useState<Mode>("ver");
  const [view, setView] = useState<TF>(INIT_TF);   // zoom/pan of the whole photo
  const [tf, setTf]   = useState<TF>(INIT_TF);     // template position relative to photo
  const fileRef = useRef<HTMLInputElement>(null);

  // Shared gesture state
  const g = useRef({ dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, pinchDist: 0, pinchAngle: 0 });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSrc(URL.createObjectURL(file));
    setView(INIT_TF);
    setTf(INIT_TF);
    setMode("ver");
  };

  // ── Generic gesture helpers (work on any TF setter) ────────────────────
  function makeHandlers(setter: React.Dispatch<React.SetStateAction<TF>>, getCurrentTF: () => TF) {
    return {
      onMouseDown(e: React.MouseEvent) {
        const cur = getCurrentTF();
        g.current = { ...g.current, dragging: true, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y };
      },
      onMouseMove(e: React.MouseEvent) {
        if (!g.current.dragging) return;
        setter(t => ({ ...t, x: g.current.ox + e.clientX - g.current.sx, y: g.current.oy + e.clientY - g.current.sy }));
      },
      onMouseUp() { g.current.dragging = false; },
      onTouchStart(e: React.TouchEvent) {
        e.preventDefault();
        const cur = getCurrentTF();
        if (e.touches.length === 2) {
          g.current.dragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          g.current.pinchDist  = Math.hypot(dx, dy);
          g.current.pinchAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        } else {
          g.current.dragging = true;
          g.current.sx = e.touches[0].clientX; g.current.sy = e.touches[0].clientY;
          g.current.ox = cur.x;                g.current.oy = cur.y;
        }
      },
      onTouchMove(e: React.TouchEvent) {
        e.preventDefault();
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const d     = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const ratio = g.current.pinchDist > 0 ? d / g.current.pinchDist : 1;
          const dAngle = angle - g.current.pinchAngle;
          setter(t => ({
            ...t,
            scale:    Math.max(0.1, Math.min(8, t.scale * ratio)),
            rotation: t.rotation + dAngle,
          }));
          g.current.pinchDist  = d;
          g.current.pinchAngle = angle;
        } else if (g.current.dragging) {
          setter(t => ({
            ...t,
            x: g.current.ox + e.touches[0].clientX - g.current.sx,
            y: g.current.oy + e.touches[0].clientY - g.current.sy,
          }));
        }
      },
      onTouchEnd() { g.current.dragging = false; },
    };
  }

  const viewH = makeHandlers(setView, () => view);
  const tfH   = makeHandlers(setTf,   () => tf);

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
            <p className="text-slate-400 text-sm">
              En modo <strong>Ver</strong> haz zoom con los dedos · En modo <strong>Ajustar</strong> mueve la plantilla
            </p>
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
  const inAdjust = mode === "ajustar";

  return (
    <div className="flex flex-col h-dvh bg-black select-none overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100 shrink-0 flex-wrap gap-y-1.5">
        <button onClick={() => setPhotoSrc(null)} className="text-slate-500 p-1 shrink-0">
          <BackArrow />
        </button>

        {/* Mode toggle */}
        <div className="flex rounded-full border border-slate-200 overflow-hidden shrink-0 text-xs font-semibold">
          {(["ver", "ajustar"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                mode === m ? "bg-blue-600 text-white" : "bg-white text-slate-500"
              }`}
            >
              {m === "ver" ? "Ver / Zoom" : "Ajustar plantilla"}
            </button>
          ))}
        </div>

        {/* Template toggle + opacity (only when adjusting) */}
        <button
          onClick={() => setShowTemplate(v => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${
            showTemplate ? "bg-green-100 text-green-700 border-green-300" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {showTemplate ? "Plantilla ✓" : "Plantilla —"}
        </button>

        {inAdjust && (
          <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <span className="text-[11px] text-slate-400 shrink-0">Opac.</span>
            <input type="range" min={10} max={90} value={opacity}
              onChange={e => setOpacity(+e.target.value)} className="flex-1" />
            <span className="text-[11px] text-slate-400 w-6 shrink-0">{opacity}%</span>
          </div>
        )}

        <div className="flex gap-1 ml-auto shrink-0">
          <button onClick={() => setView(INIT_TF)}
            className="text-[11px] text-slate-400 px-2 py-1 border border-slate-200 rounded">
            Reset vista
          </button>
          {inAdjust && (
            <button onClick={() => setTf(INIT_TF)}
              className="text-[11px] text-slate-400 px-2 py-1 border border-slate-200 rounded">
              Reset plantilla
            </button>
          )}
        </div>
      </div>

      {/* Rotation buttons (only in adjust mode) */}
      {inAdjust && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border-b border-slate-100 shrink-0">
          <span className="text-[11px] text-slate-400">Girar plantilla:</span>
          {[-10, -1, 1, 10].map(deg => (
            <button key={deg}
              onClick={() => setTf(t => ({ ...t, rotation: t.rotation + deg }))}
              className="text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded">
              {deg > 0 ? `+${deg}°` : `${deg}°`}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 font-mono ml-1">{tf.rotation.toFixed(1)}°</span>
        </div>
      )}

      <p className="text-center text-[11px] text-white/40 py-0.5 shrink-0">
        {inAdjust
          ? "Arrastra la plantilla · Pellizca para escalar · Gira con dos dedos"
          : "Pellizca para hacer zoom · Arrastra para mover"}
      </p>

      {/* ── Content area ── */}
      <div
        className="relative flex-1 overflow-hidden"
        // View mode: gestures move/zoom the whole photo
        onMouseMove={!inAdjust ? viewH.onMouseMove : undefined}
        onMouseUp={!inAdjust ? viewH.onMouseUp : undefined}
        onMouseLeave={!inAdjust ? viewH.onMouseUp : undefined}
        onMouseDown={!inAdjust ? viewH.onMouseDown : undefined}
        onTouchStart={!inAdjust ? viewH.onTouchStart : undefined}
        onTouchMove={!inAdjust ? viewH.onTouchMove : undefined}
        onTouchEnd={!inAdjust ? viewH.onTouchEnd : undefined}
      >
        {/* Inner wrapper — moved by the view transform */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt="Prueba"
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Template overlay */}
          {showTemplate && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/plantilla-correccion.png"
              alt="Plantilla"
              draggable={false}
              // Adjust mode: template handles its own gestures
              onMouseDown={inAdjust ? tfH.onMouseDown : undefined}
              onMouseMove={inAdjust ? tfH.onMouseMove : undefined}
              onMouseUp={inAdjust ? tfH.onMouseUp : undefined}
              onTouchStart={inAdjust ? tfH.onTouchStart : undefined}
              onTouchMove={inAdjust ? tfH.onTouchMove : undefined}
              onTouchEnd={inAdjust ? tfH.onTouchEnd : undefined}
              className={`absolute inset-0 w-full h-full object-contain touch-none ${inAdjust ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
              style={{
                opacity: opacity / 100,
                transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale}) rotate(${tf.rotation}deg)`,
                transformOrigin: "center center",
              }}
            />
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
