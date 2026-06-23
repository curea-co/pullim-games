// 공개 도메인 정합 — metadataBase / OG / canonical absolute URL 의 단일 기준.
//
// 핵심: Vercel `VERCEL_URL` 은 배포별 `*.vercel.app` 호스트이지 **커스텀 도메인이 아니다**.
// 따라서 main→games.pullim.ai, dev→dev-games.pullim.ai 의 *공개 도메인* 은 배포 컨텍스트
// (`VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF`)로 명시 매핑한다. PR preview(임의 브랜치)는 자기
// 배포 호스트(`VERCEL_URL`)를 쓰는 게 실제 접속 URL 과 정합.
//
// 우선순위 — **공개 도메인 매핑이 env override 보다 우선**한다. 이유: 기존 Vercel 프로젝트에
// 남아있을 수 있는 stale `NEXT_PUBLIC_SITE_URL`(옛 *.vercel.app/구 도메인)이 main/dev 의
// 공개 도메인을 영구 우회하는 것을 막기 위함 (codex #123).
//   1) production 배포            → https://games.pullim.ai
//   2) dev 브랜치 배포            → https://dev-games.pullim.ai
//   3) NEXT_PUBLIC_SITE_URL       → 명시 override (prod/dev 외 컨텍스트의 escape hatch)
//   4) 그 외 preview(PR 등)       → https://<배포별 VERCEL_URL>
//   5) 로컬/미상                  → https://games.pullim.ai (최종 폴백)

export function getSiteUrl(): string {
  if (process.env.VERCEL_ENV === "production") return "https://games.pullim.ai";
  if (process.env.VERCEL_GIT_COMMIT_REF === "dev")
    return "https://dev-games.pullim.ai";
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://games.pullim.ai";
}

/** 표시용 호스트(스킴 제거) — 예: "games.pullim.ai". OG 카드 도메인 표기 등. */
export function getSiteHost(): string {
  return getSiteUrl().replace(/^https?:\/\//, "");
}
