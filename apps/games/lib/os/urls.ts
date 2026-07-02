// 풀림 OS 서비스 앱 origin 헬퍼 — pullim-web src/lib/auth/config.ts 정식 이식 + 배포 컨텍스트 인식.
// ServiceSwitcher(앱-홉)가 다른 풀림 앱으로 하드 내비게이션할 때 절대링크에 쓴다.
// 회원 access 쿠키는 Domain=.pullim.ai 라 톱레벨 하드 내비게이션이면 cross-서브도메인 자동 동반.
//
// ⚠️ 환경 정합(codex #138 R1): dev-games/preview 에서 ServiceSwitcher 가 production 형제 앱으로
//    새지 않도록 **같은 환경의 형제**로 보낸다. 우선순위:
//   1) 명시 env override — `NEXT_PUBLIC_*_URL` (빌드 인라인, prod/dev 외 컨텍스트 escape hatch)
//   2) 클라이언트 — 현재 호스트로 판정(`dev-games.pullim.ai` → `dev-` 형제, 그 외 → prod 형제)
//   3) 서버(SSR/빌드) — `VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF` (site-url.ts 와 동일 규칙)
//   4) 폴백 — prod (배포 빌드가 localhost 로 새지 않게)
// SSR·클라 판정이 dev/prod 각 환경에서 일치하므로 하이드레이션 미스매치 없음.
// games 자기 호스트 판정(metadataBase 등)은 @/lib/site-url 이 담당(본 파일과 별개).

const strip = (u: string): string => u.replace(/\/$/, "");

// 현재 배포 환경의 서브도메인 접두("" = prod, "dev-" = dev).
function envPrefix(): "" | "dev-" {
  if (typeof window !== "undefined") {
    // 클라이언트: 접속 호스트가 곧 환경. dev-games.pullim.ai → dev- 형제.
    return window.location.hostname.startsWith("dev-") ? "dev-" : "";
  }
  // 서버(SSR/빌드): Vercel 컨텍스트. (커스텀 도메인은 VERCEL_URL 이 *.vercel.app 이라 branch 로 판정)
  if (process.env.VERCEL_ENV === "production") return "";
  if (process.env.VERCEL_GIT_COMMIT_REF === "dev") return "dev-";
  return "";
}

// 서브도메인 → origin. 명시 env override 최우선, 없으면 환경 접두로 형제 도메인 구성.
function serviceOrigin(sub: string, explicit: string | undefined): string {
  if (explicit) return strip(explicit);
  return `https://${envPrefix()}${sub}.pullim.ai`;
}

/** OS 웹 셸(os.pullim.ai) origin. OS-내부 라우트 서비스(문제큐·클래스봇·스튜디오 등) 위임 진입. */
export function osUrl(): string {
  return serviceOrigin("os", process.env.NEXT_PUBLIC_OS_URL);
}

/** 플래너 독립 앱(planner.pullim.ai) origin. */
export function plannerUrl(): string {
  return serviceOrigin("planner", process.env.NEXT_PUBLIC_PLANNER_URL);
}

/** 게임즈 독립 앱(games.pullim.ai) origin — 자기 앱(current). */
export function gamesUrl(): string {
  return serviceOrigin("games", process.env.NEXT_PUBLIC_GAMES_URL);
}

/** 아케이드 독립 앱(arcade.pullim.ai) origin. */
export function arcadeUrl(): string {
  return serviceOrigin("arcade", process.env.NEXT_PUBLIC_ARCADE_URL);
}

/** 주니어 독립 앱(jr.pullim.ai) origin — 초등 전용. */
export function jrUrl(): string {
  return serviceOrigin("jr", process.env.NEXT_PUBLIC_JR_URL);
}
