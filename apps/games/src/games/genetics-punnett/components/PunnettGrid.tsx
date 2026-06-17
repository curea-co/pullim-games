// 펀넷 격자 — 부모 gametes 의 외적 격자 표시.
// playing: 유전자형만 표시 (학생이 우성/열성 판단해서 비율 추론).
// correct: 표현형 카테고리별로 색칠 (학습 보강).

import type { OffspringGenotype } from "../logic/computeOffspring";

const PHENOTYPE_COLORS = [
  "bg-accent-positive/15 text-type-primary",
  "bg-pullim-blue-100 text-pullim-blue-700",
  "bg-amber-100 text-amber-800",
  "bg-pullim-slate-100 text-type-primary",
];

interface PunnettGridProps {
  /** 부모 1 gametes (열 헤더 — 격자 상단). */
  topGametes: string[];
  /** 부모 2 gametes (행 헤더 — 격자 좌측). */
  leftGametes: string[];
  /** 자손 격자. shape = [leftGametes.length][topGametes.length]. */
  grid: OffspringGenotype[][];
  /** correct phase 일 때 표현형 색칠. */
  colored: boolean;
}

export function PunnettGrid({
  topGametes,
  leftGametes,
  grid,
  colored,
}: PunnettGridProps) {
  const cols = topGametes.length;
  return (
    <div
      role="grid"
      aria-label="펀넷 사각형 자손 격자"
      className="mx-auto inline-grid gap-1 text-label tabular text-type-primary"
      style={{
        gridTemplateColumns: `auto repeat(${cols}, minmax(2.75rem, 1fr))`,
      }}
    >
      {/* 좌상단 빈 칸 */}
      <div aria-hidden="true" />
      {/* 상단 헤더 (부모 1 gametes) */}
      {topGametes.map((g, i) => (
        <div
          key={`top-${i}`}
          role="columnheader"
          className="rounded-block border border-border-hairline bg-bg-block px-2 py-2 text-center text-body"
        >
          {g}
        </div>
      ))}
      {/* 행 = 좌측 헤더 + 격자 셀 */}
      {leftGametes.map((leftG, rowIdx) => (
        <PunnettRow
          key={`row-${rowIdx}`}
          rowIdx={rowIdx}
          leftGamete={leftG}
          cells={grid[rowIdx] ?? []}
          colored={colored}
        />
      ))}
    </div>
  );
}

interface PunnettRowProps {
  rowIdx: number;
  leftGamete: string;
  cells: OffspringGenotype[];
  colored: boolean;
}

function PunnettRow({ rowIdx, leftGamete, cells, colored }: PunnettRowProps) {
  return (
    <>
      <div
        role="rowheader"
        className="rounded-block border border-border-hairline bg-bg-block px-2 py-2 text-center text-body"
      >
        {leftGamete}
      </div>
      {cells.map((cell, colIdx) => {
        const color =
          colored && PHENOTYPE_COLORS[cell.phenotypeIndex]
            ? PHENOTYPE_COLORS[cell.phenotypeIndex]
            : "bg-bg-block text-type-primary";
        return (
          <div
            key={`cell-${rowIdx}-${colIdx}`}
            role="gridcell"
            className={`rounded-block border border-border-hairline px-2 py-2 text-center text-body transition-colors ${color}`}
          >
            {cell.genotype}
          </div>
        );
      })}
    </>
  );
}
