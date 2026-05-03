"use client";
import Image from "next/image";
import Link from "next/link";

export default function ImprimirPage() {
  const handlePrint = () => window.print();

  return (
    <>
      {/* ── Pantalla normal (no-print) ── */}
      <div className="print:hidden flex flex-col min-h-screen">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-white">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <BackArrow />
          </Link>
          <h1 className="font-semibold text-slate-800">Imprimir prueba d2</h1>
        </header>

        <div className="flex flex-col items-center gap-6 px-4 py-8 flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 max-w-lg w-full">
            <p className="text-sm text-slate-600 mb-3 font-medium">Instrucciones:</p>
            <ol className="list-decimal list-inside text-sm text-slate-500 space-y-1">
              <li>Pulsa el botón "Imprimir" de abajo.</li>
              <li>Selecciona orientación <strong>Horizontal</strong> y sin márgenes.</li>
              <li>Imprime en tamaño A4.</li>
              <li>El sujeto completa la prueba en papel.</li>
              <li>Ve a <strong>Corregir prueba</strong> y fotografía la hoja.</li>
            </ol>
          </div>

          <div className="w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 shadow">
            <Image
              src="/prueba-d2-imprimible.png"
              alt="Prueba d2 con marcadores"
              width={2400}
              height={1634}
              className="w-full h-auto"
              priority
            />
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl px-8 py-4 shadow-md transition-colors"
          >
            <PrintIcon />
            Imprimir
          </button>
        </div>
      </div>

      {/* ── Versión de impresión ── */}
      <div className="hidden print:block">
        {/* El navegador añade sus propios márgenes; la imagen llena la hoja */}
        {/* stylelint-disable-next-line */}
        <style>{`@page { size: A4 landscape; margin: 0; }`}</style>
        <img
          src="/prueba-d2-imprimible.png"
          alt="Prueba d2"
          style={{ width: "100%", height: "100vh", objectFit: "contain" }}
        />
      </div>
    </>
  );
}

function BackArrow() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}
