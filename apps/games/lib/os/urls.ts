// 풀림 OS 서비스 앱 origin 헬퍼 — pullim-web src/lib/auth/config.ts 정식 이식.
// ServiceSwitcher(앱-홉)가 다른 풀림 앱으로 하드 내비게이션할 때 절대링크에 쓴다.
// 회원 access 쿠키는 Domain=.pullim.ai 라 톱레벨 하드 내비게이션이면 cross-서브도메인 자동 동반.
// NEXT_PUBLIC_* 는 빌드타임 인라인 — 환경별 빌드 env 주입(누락 시 prod 폴백, 배포 빌드가 localhost 로 새지 않게).
// games 자기 호스트 판정은 @/lib/site-url 이 담당(본 파일과 별개).

const strip = (u: string): string => u.replace(/\/$/, "");

/** OS 웹 셸(os.pullim.ai) origin. OS-내부 라우트 서비스(문제큐·클래스봇·스튜디오 등) 위임 진입에 쓴다. */
export function osUrl(): string {
  return strip(process.env.NEXT_PUBLIC_OS_URL ?? "https://os.pullim.ai");
}

/** 플래너 독립 앱(planner.pullim.ai) origin. */
export function plannerUrl(): string {
  return strip(process.env.NEXT_PUBLIC_PLANNER_URL ?? "https://planner.pullim.ai");
}

/** 게임즈 독립 앱(games.pullim.ai) origin — 자기 앱(current). */
export function gamesUrl(): string {
  return strip(process.env.NEXT_PUBLIC_GAMES_URL ?? "https://games.pullim.ai");
}

/** 아케이드 독립 앱(arcade.pullim.ai) origin. */
export function arcadeUrl(): string {
  return strip(process.env.NEXT_PUBLIC_ARCADE_URL ?? "https://arcade.pullim.ai");
}

/** 주니어 독립 앱(jr.pullim.ai) origin — 초등 전용. */
export function jrUrl(): string {
  return strip(process.env.NEXT_PUBLIC_JR_URL ?? "https://jr.pullim.ai");
}
