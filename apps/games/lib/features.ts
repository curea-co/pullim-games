// 앱 레벨 기능 플래그 — 단일 SoT.
//
// 도메인 로직(lib/core)이 아니라 "이 기능을 켜고 끄는가" 스위치. 서버/클라이언트
// 양쪽에서 import 가능하도록 top-level 부수효과 없이 순수 상수만 둔다.

/**
 * 관리(manage) 영역 활성 여부.
 *
 * false = 콘텐츠 저작(과목·교육과정·카드·내 게임·결제) 전면 비활성.
 * 되돌리기는 이 한 줄을 `true` 로 — 네비·라우트·딥링크 CTA·e2e 가 모두
 * 이 플래그를 참조하므로 자동 원복된다.
 *
 * `: boolean` 명시는 의도적 — 리터럴 `false` 로 좁혀지면 redirect 이후
 * 코드가 unreachable 로 판정돼 lint(no-unreachable)가 터진다.
 *
 * 근거: proc/plan/2026-07-02_disable-manage.md
 */
export const MANAGE_ENABLED: boolean = false;
