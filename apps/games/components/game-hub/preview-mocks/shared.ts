// preview-mocks 공통 디자인 토큰. 5 mock 일관성 유지.
// `2026-05-11_preview-mocks.md` §6 따름.

import { cn } from "@/lib/utils";

/** 기본 loop duration (초). */
export const LOOP_DURATION = 4;

/** 기본 ease. framer-motion 의 stringy easing. */
export const LOOP_EASE = [0.4, 0, 0.2, 1] as const;

/** mock 외곽 wrapper — 16:10 부모 안에 정렬. */
export function mockWrapperClass(locked?: boolean): string {
  return cn(
    "absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden bg-pullim-slate-50",
    locked && "grayscale opacity-60",
  );
}

export interface MockVariant {
  /** manipulation: 좌측 식 */
  left?: string;
  /** manipulation: 우측 식 */
  right?: string;
  /** sorting: 3개 항목 (정렬 전 순서) */
  itemsShuffled?: [string, string, string];
  /** sorting: 정렬 후 */
  itemsSorted?: [string, string, string];
  /** matching: 좌·우 짝 (2 쌍) */
  pairs?: [{ left: string; right: string }, { left: string; right: string }];
  /** multiple-choice: 질문 + 4 보기 + 정답 인덱스 */
  question?: string;
  choices?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  /** typing: 완성 단어 */
  word?: string;
  /** typing: 뜻/힌트 */
  hint?: string;
}

export interface MockProps {
  variant: MockVariant;
  locked?: boolean;
}
