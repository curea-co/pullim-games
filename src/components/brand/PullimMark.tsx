// 풀림 게임즈 브랜드 마크 (픽셀아트). 헤더 로고·icon.svg 와 동형.
// 색: 블루 라운드스퀘어(#0362DA) + 흰/라임(#E6FF4C) 픽셀. 근거: 2026-06-01 브랜딩 리프레시.

export function PullimMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#0362DA" />
      <rect x="30" y="26" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="26" width="8" height="8" fill="#FFFFFF" />
      <rect x="38" y="34" width="24" height="8" fill="#FFFFFF" />
      <rect x="22" y="42" width="56" height="8" fill="#FFFFFF" />
      <rect x="22" y="50" width="8" height="8" fill="#FFFFFF" />
      <rect x="38" y="50" width="8" height="8" fill="#E6FF4C" />
      <rect x="54" y="50" width="8" height="8" fill="#E6FF4C" />
      <rect x="70" y="50" width="8" height="8" fill="#FFFFFF" />
      <rect x="22" y="58" width="56" height="8" fill="#FFFFFF" />
      <rect x="30" y="66" width="8" height="8" fill="#FFFFFF" />
      <rect x="62" y="66" width="8" height="8" fill="#FFFFFF" />
      <rect x="22" y="74" width="8" height="8" fill="#FFFFFF" />
      <rect x="70" y="74" width="8" height="8" fill="#FFFFFF" />
    </svg>
  );
}
