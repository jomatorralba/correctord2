import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 min-h-screen gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Corrector d2</h1>
        <p className="text-slate-500 text-base max-w-xs mx-auto">
          Corrige el test de atención d2 en segundos con una foto
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/corregir"
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-2xl px-6 py-5 shadow-md transition-colors"
        >
          <CameraIcon />
          Corregir una prueba
        </Link>

        <Link
          href="/imprimir"
          className="flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-lg font-semibold rounded-2xl px-6 py-5 border border-slate-200 shadow-sm transition-colors"
        >
          <PrintIcon />
          Imprimir la prueba
        </Link>
      </div>

      <p className="text-slate-400 text-xs text-center max-w-xs">
        Imprime la prueba con marcadores, el sujeto la rellena y luego
        fotografíala para corregirla automáticamente.
      </p>
    </main>
  );
}

function CameraIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}
