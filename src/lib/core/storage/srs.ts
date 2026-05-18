// CardSrsState localStorage 영속화.
// V1: 비로그인 — fingerprint 단위 로컬 저장 (SPEC §05.5).
// V2: 서버 백업 (Vercel KV).
//
// 저장 키: pullim-games:srs:<gameId>:<cardId>

import {
  type CardSrsState,
  createInitialState,
} from "@/lib/core/fsrs";
import { recordActivityAndSave } from "@/lib/core/streak";
import { recordGameActivity } from "./activity-log";
import type { Card as FsrsCard } from "ts-fsrs";

const KEY_PREFIX = "pullim-games:srs";

// ts-fsrs 5.x 부터 Card 에 learning_steps 필드 추가됨.
// v4 시점 저장된 localStorage 데이터에는 이 필드가 없으므로 deserialize 시 0 fallback.
interface SerializedState {
  fsrsCard: Omit<FsrsCard, "due" | "last_review" | "learning_steps"> & {
    due: string; // ISO
    last_review: string | null;
    learning_steps?: number; // v4 데이터엔 누락
  };
  reviewCount: number;
  lastReviewAt: string | null; // ISO
}

function serialize(state: CardSrsState): SerializedState {
  return {
    fsrsCard: {
      ...state.fsrsCard,
      due: state.fsrsCard.due.toISOString(),
      last_review: state.fsrsCard.last_review
        ? state.fsrsCard.last_review.toISOString()
        : null,
    },
    reviewCount: state.reviewCount,
    lastReviewAt: state.lastReviewAt
      ? state.lastReviewAt.toISOString()
      : null,
  };
}

function deserialize(raw: SerializedState): CardSrsState {
  return {
    fsrsCard: {
      ...raw.fsrsCard,
      due: new Date(raw.fsrsCard.due),
      last_review: raw.fsrsCard.last_review
        ? new Date(raw.fsrsCard.last_review)
        : (undefined as unknown as Date),
      learning_steps: raw.fsrsCard.learning_steps ?? 0,
    } as FsrsCard,
    reviewCount: raw.reviewCount,
    lastReviewAt: raw.lastReviewAt ? new Date(raw.lastReviewAt) : null,
  };
}

function key(gameId: string, cardId: string): string {
  return `${KEY_PREFIX}:${gameId}:${cardId}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 카드 SRS 상태 로드. 없거나 손상된 경우 초기 상태. */
export function loadSrsState(
  gameId: string,
  cardId: string,
): CardSrsState {
  const storage = getStorage();
  if (!storage) return createInitialState();
  try {
    const raw = storage.getItem(key(gameId, cardId));
    if (!raw) return createInitialState();
    return deserialize(JSON.parse(raw) as SerializedState);
  } catch {
    return createInitialState();
  }
}

/** 카드 SRS 상태 저장. localStorage 실패 시 silent. */
export function saveSrsState(
  gameId: string,
  cardId: string,
  state: CardSrsState,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key(gameId, cardId), JSON.stringify(serialize(state)));
  } catch {
    // localStorage 가득 차거나 거부됨 — 게임 진행은 깨지지 않게
  }
}

/** SRS 저장 + 일일 학습 스트릭 활동 기록 + 게임별 활동 로그 (단일 백본).
 *  plan 2026-05-15_fsrs-streak-backbone §D4.A wrapper helper +
 *  2026-05-18_home-dashboard-revamp §3 Phase 2 (게임별 일별 카운터).
 *  게임 컴포넌트는 saveSrsState 대신 본 함수를 호출. */
export function saveSrsAndRecord(
  gameId: string,
  cardId: string,
  state: CardSrsState,
): void {
  saveSrsState(gameId, cardId, state);
  recordActivityAndSave();
  recordGameActivity(gameId);
}

/** 게임의 모든 카드 SRS 상태 일괄 로드 (FSRS 우선순위 큐 입력용). */
export function loadAllSrsStates(
  gameId: string,
): Map<string, CardSrsState> {
  const result = new Map<string, CardSrsState>();
  const storage = getStorage();
  if (!storage) return result;

  const prefix = `${KEY_PREFIX}:${gameId}:`;
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const cardId = k.slice(prefix.length);
      result.set(cardId, loadSrsState(gameId, cardId));
    }
  } catch {
    // ignore
  }
  return result;
}

/** 테스트/리셋용. */
export function clearAllSrsStates(gameId?: string): void {
  const storage = getStorage();
  if (!storage) return;
  const prefix = gameId ? `${KEY_PREFIX}:${gameId}:` : `${KEY_PREFIX}:`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (k?.startsWith(prefix)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => storage.removeItem(k));
}
