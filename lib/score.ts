export interface LineScore {
  tr: number; // índice del último elemento tachado en la fila (posición, no conteo)
  ta: number; // aciertos (tachados que son diana) hasta el último tachado
  o: number;  // omisiones (diana no tachada) hasta el último tachado
  c: number;  // comisiones (tachado no diana) hasta el último tachado
}

export interface D2Score {
  lines: LineScore[];
  TR: number; TA: number; O: number; C: number;
  TOT: number; CON: number; VAR: number;
}

// crossed[row][col] = true if the item was crossed out
// answerKey["1"] = [col1, col2, ...] (1-indexed)
export function computeScore(
  crossed: boolean[][],
  answerKey: Record<string, number[]>
): D2Score {
  const lines: LineScore[] = crossed.map((rowCrossed, rowIdx) => {
    const targets = new Set(answerKey[String(rowIdx + 1)] ?? []);

    // TR = posición (1-indexed) del último elemento tachado en la fila
    let lastCrossedIdx = -1;
    rowCrossed.forEach((isCrossed, colIdx) => { if (isCrossed) lastCrossedIdx = colIdx; });
    const tr = lastCrossedIdx + 1; // 0 si no tachó nada

    let ta = 0, o = 0, c = 0;
    for (let colIdx = 0; colIdx <= lastCrossedIdx; colIdx++) {
      const col1 = colIdx + 1;
      const isTarget = targets.has(col1);
      if (rowCrossed[colIdx]) { isTarget ? ta++ : c++; }
      else if (isTarget) o++;
    }
    return { tr, ta, o, c };
  });

  const TR = lines.reduce((s, l) => s + l.tr, 0);
  const TA = lines.reduce((s, l) => s + l.ta, 0);
  const O  = lines.reduce((s, l) => s + l.o,  0);
  const C  = lines.reduce((s, l) => s + l.c,  0);
  const TOT = TR - C;
  const CON = TA - C;
  const trValues = lines.map(l => l.tr);
  const VAR = Math.max(...trValues) - Math.min(...trValues);

  return { lines, TR, TA, O, C, TOT, CON, VAR };
}
