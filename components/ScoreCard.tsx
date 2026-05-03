import type { D2Score } from "@/lib/score";

export default function ScoreCard({ score }: { score: D2Score }) {
  const { lines, TR, TA, O, C, TOT, CON, VAR } = score;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
      {/* Totales */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-200">
        {[
          { label: "TR", value: TR, desc: "Respuestas" },
          { label: "TA", value: TA, desc: "Aciertos" },
          { label: "O",  value: O,  desc: "Omisiones" },
          { label: "C",  value: C,  desc: "Comisiones" },
        ].map(({ label, value, desc }) => (
          <div key={label} className="flex flex-col items-center py-4 px-2">
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            <span className="text-xs font-semibold text-blue-600 mt-0.5">{label}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      {/* Índices */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50">
        {[
          { label: "TOT", value: TOT, desc: "TR − C" },
          { label: "CON", value: CON, desc: "TA − C" },
          { label: "VAR", value: VAR, desc: "Variación" },
        ].map(({ label, value, desc }) => (
          <div key={label} className="flex flex-col items-center py-3 px-2">
            <span className="text-xl font-bold text-slate-700">{value}</span>
            <span className="text-xs font-semibold text-slate-500 mt-0.5">{label}</span>
            <span className="text-[10px] text-slate-400">{desc}</span>
          </div>
        ))}
      </div>

      {/* Tabla por línea */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[280px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-2 px-3 text-left font-semibold text-slate-500">Línea</th>
              <th className="py-2 px-2 text-center font-semibold text-slate-500">TR</th>
              <th className="py-2 px-2 text-center font-semibold text-green-600">TA</th>
              <th className="py-2 px-2 text-center font-semibold text-amber-600">O</th>
              <th className="py-2 px-2 text-center font-semibold text-red-500">C</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                <td className="py-1.5 px-2 text-center text-slate-700 font-medium">{l.tr}</td>
                <td className="py-1.5 px-2 text-center text-green-600 font-medium">{l.ta}</td>
                <td className="py-1.5 px-2 text-center text-amber-600 font-medium">{l.o}</td>
                <td className="py-1.5 px-2 text-center text-red-500 font-medium">{l.c}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold border-t border-slate-200">
              <td className="py-2 px-3 text-slate-600">Total</td>
              <td className="py-2 px-2 text-center text-slate-800">{TR}</td>
              <td className="py-2 px-2 text-center text-green-700">{TA}</td>
              <td className="py-2 px-2 text-center text-amber-700">{O}</td>
              <td className="py-2 px-2 text-center text-red-600">{C}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
