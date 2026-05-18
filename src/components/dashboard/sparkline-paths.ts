// SVG path 생성 — sparkline 시각화용 순수 함수.
// 컴포넌트에서 분리 — JSX 의존 X, 테스트 용이.

export function buildPaths(
  counts: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (counts.length === 0) return { line: "", area: "" };

  const max = Math.max(1, ...counts);
  const stepX = counts.length > 1 ? width / (counts.length - 1) : width;
  const points = counts.map((c, i) => {
    const x = i * stepX;
    const y = height - 1 - (c / max) * (height - 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;

  return { line: linePath, area: areaPath };
}
