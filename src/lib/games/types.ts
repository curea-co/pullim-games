// Game Registry 계약 — SPEC §3.2.1 + 병렬 개발 아키텍처 기획서 §5.2
// + 게임 라인업/필터링 기획서 §6 참조.

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

/** 게임 메커닉 결 — 필터링 축. proc/plan/2026-05-08_game-lineup-and-filtering.md §4.1 */
export type GameMechanic =
  | "manipulation"   // 풀이 동작 = 게임 메커닉 (factorization)
  | "sorting"        // 순서 맞추기 (history-timeline, english-order)
  | "matching"       // 짝 맞추기 (word-match)
  | "multiple-choice"// 빠른 4지선다 (quick-quiz)
  | "typing";        // 출력형 retrieval (vocab-typing)

/** retrieval 깊이 — 필터링 축. research §2.1 + plan §4.3 */
export type RetrievalDepth = "shallow" | "medium" | "deep";

export interface GameMeta {
  /** 메인페이지 카드 좌상단에 표시되는 lucide-react 아이콘. */
  icon: LucideIcon;

  /** 메커닉 결 — 필터링 축 (V3부터 활성). */
  mechanic: GameMechanic;

  /** retrieval 깊이 — 추천 알고리즘 + 표시용. */
  retrievalDepth: RetrievalDepth;

  /** URL slug. 영문 소문자 + 하이픈만. 예: 'factorization', 'quick-quiz' */
  id: string;

  /** 메인페이지 카드 한국어 제목. 예: '인수분해 블록 분리' */
  title: string;

  /** 과목 라벨. 예: '수학', '영어', '한국사' */
  subject: string;

  /** 단원 라벨. 예: '고1 다항식', '수능 어휘' */
  unit: string;

  /** 한 줄 설명. 메인페이지 카드 부가 카피. */
  tagline: string;

  /** 예상 플레이 시간 (분 단위). 5문제 시퀀스 기준. */
  estimatedMinutes: number;

  /** 'available' = 플레이 가능. 'coming-soon' = 카드 비활성. */
  status: "available" | "coming-soon";

  /**
   * 게임 출처 분류 (M5 추가):
   *   'official' = 풀림 게임즈 기본 제공 (factorization, math-quick-quiz 등)
   *   'custom'   = 사용자 콘텐츠 기반 (custom-* 게임)
   * 게임 허브에서 별도 영역으로 분리 (CustomGamesSection).
   * 미지정 시 'official' 로 간주 (기존 manifest 호환).
   */
  kind?: "official" | "custom";

  /** 게임별 OG 카드 경로 (V2 — V1은 공통 OG 사용 가능) */
  ogImagePath?: string;

  /**
   * 게임 허브 미리보기 자산 (V1 옵션 A — 5번째 view "미리보기").
   * public/ 기준 경로. 권장: 640×400 (16:10) PNG/WebP, 100KB 이내.
   * 누락 시 PreviewView 가 fallback (아이콘 + "미리보기 준비 중") 렌더.
   * proc/archive/plan/2026-05-11_game-preview.md §3.1.
   */
  previewImagePath?: string;
}

/**
 * 게임 모듈 매니페스트.
 * 자동 발견 (scripts/generate-registry.ts) 의 대상이며,
 * 각 src/games/<id>/manifest.ts 가 default export 해야 한다.
 *
 * loadComponent 는 동적 import 팩토리 — Next.js 가 게임별 청크 분할에 사용.
 */
export interface GameManifest {
  meta: GameMeta;
  loadComponent: () => Promise<{ default: ComponentType }>;
}
