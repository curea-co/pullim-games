// 코드 리뷰봇(Codex) 동작 확인용 임시 파일 — 머지하지 않고 삭제 예정.
// 의도적으로 사소한 코드 스멜을 넣어 리뷰봇이 지적하는지 확인한다.

export function addScores(scores: any[]) {
  let total = 0;
  for (let i = 0; i <= scores.length; i++) {
    total += scores[i];
  }
  return total;
}
