// 화학식 → 원소별 원자 수 파싱.
// "H2O" → { H: 2, O: 1 }, "Fe2O3" → { Fe: 2, O: 3 }.
// 괄호·이온 표기는 V3+ 확장.

const ELEMENT_TOKEN = /([A-Z][a-z]?)(\d*)/g;

export function parseFormula(formula: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const match of formula.matchAll(ELEMENT_TOKEN)) {
    const element = match[1];
    if (!element) continue;
    const num = match[2] ? parseInt(match[2], 10) : 1;
    counts[element] = (counts[element] ?? 0) + num;
  }
  return counts;
}

/** 한 변(반응물 또는 생성물)의 원소별 총 원자 수. */
export function sumSide(
  parts: { formula: string; coefficient: number }[],
): Record<string, number> {
  const total: Record<string, number> = {};
  for (const p of parts) {
    const atoms = parseFormula(p.formula);
    for (const [el, n] of Object.entries(atoms)) {
      total[el] = (total[el] ?? 0) + n * p.coefficient;
    }
  }
  return total;
}

/** 모든 원소 키 (양변 합집합). */
export function allElements(
  reactants: { formula: string }[],
  products: { formula: string }[],
): string[] {
  const set = new Set<string>();
  for (const p of [...reactants, ...products]) {
    for (const el of Object.keys(parseFormula(p.formula))) set.add(el);
  }
  return [...set].sort();
}

export function isBalanced(
  reactants: { formula: string; coefficient: number }[],
  products: { formula: string; coefficient: number }[],
): boolean {
  const left = sumSide(reactants);
  const right = sumSide(products);
  const elements = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const el of elements) {
    if ((left[el] ?? 0) !== (right[el] ?? 0)) return false;
  }
  return true;
}
