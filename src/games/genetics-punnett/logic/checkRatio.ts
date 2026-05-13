// 학생이 입력한 표현형 비율 vs 정답 비율 비교.
// 약분된 형태로 비교 — 학생이 9:3:3:1 또는 18:6:6:2 입력 모두 정답.
// 0 항(예: AA × aa → [1,0]) 은 정답 입력도 0이어야 함.

/** 양의 정수 리스트의 GCD. 모두 0 이면 0 반환. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function reduceRatio(ratio: number[]): number[] {
  const nonZero = ratio.filter((n) => n > 0);
  if (nonZero.length === 0) return ratio.map(() => 0);
  let divisor = nonZero[0]!;
  for (let i = 1; i < nonZero.length; i++) {
    divisor = gcd(divisor, nonZero[i]!);
  }
  return ratio.map((n) => n / divisor);
}

/** 학생 입력이 정답 비율과 동치인지. 길이 다르면 false. */
export function checkRatio(input: number[], expected: number[]): boolean {
  if (input.length !== expected.length) return false;
  if (input.some((n) => !Number.isInteger(n) || n < 0)) return false;
  if (input.every((n) => n === 0)) return false;
  const inReduced = reduceRatio(input);
  const exReduced = reduceRatio(expected);
  return inReduced.every((n, i) => n === exReduced[i]);
}
