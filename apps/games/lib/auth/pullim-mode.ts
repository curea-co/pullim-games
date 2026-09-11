// pullim 모드 판정 — 회원 신원을 pullim-web/pullim-api 중앙 인증(SSO)으로 위임하는 모드.
// 권위: spec/05 §5.2(회원 신원 중앙 위임)·spec/09 §9.4(env all-or-nothing).
// plan: proc/plan/2026-07-03_games-unified-login-os-delegation.md §2-D·PR-1.
//
// 서버·클라·엣지(middleware) 공용 — env 는 NEXT_PUBLIC_ 라 빌드타임 인라인되므로
// 양쪽에서 동일 값. "use client" 아님(순수 env 모듈).
//
// ⚠️ all-or-nothing (Codex #140): 두 env 는 함께여야 한다. 한쪽만 설정되면 introspection 은
// 켜지나(DOMAIN_API_URL) 미인증 리다이렉트 URL(LOGIN_ORIGIN)을 못 만들어 런타임에서만 깨진다
// → 모듈 로드 시 fail-fast(빌드/부팅 에러)로 조기 발견. 둘 다 미설정 = legacy(games 자체 auth).

const strip = (u: string | undefined): string => (u ? u.replace(/\/+$/, "") : "");

const DOMAIN_API_URL = strip(process.env.NEXT_PUBLIC_DOMAIN_API_URL);
const LOGIN_ORIGIN = strip(process.env.NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN);

if (Boolean(DOMAIN_API_URL) !== Boolean(LOGIN_ORIGIN)) {
  throw new Error(
    "[pullim-mode] env 설정 오류: NEXT_PUBLIC_DOMAIN_API_URL 과 " +
      "NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN 은 함께 설정해야 합니다(all-or-nothing). " +
      "한쪽만 설정되면 introspection 은 켜지나 로그인 리다이렉트 URL 이 없어 런타임에서 깨집니다. " +
      "둘 다 설정(pullim 모드) 또는 둘 다 미설정(legacy) 중 하나로 두세요.",
  );
}

/** pullim 모드 활성 여부(두 env 모두 설정 시 true). 미설정 = legacy(games 자체 auth). */
export const PULLIM_MODE = Boolean(DOMAIN_API_URL);

/** pullim-api base URL(introspection `/games/me`·직접 호출). pullim 모드에서만 non-empty. */
export const PULLIM_DOMAIN_API_URL = DOMAIN_API_URL;

/** 미인증 회원 리다이렉트 대상 = pullim-web SITE 호스트(`/login`·`/signup`). pullim 모드에서만 non-empty. */
export const PULLIM_LOGIN_ORIGIN = LOGIN_ORIGIN;
