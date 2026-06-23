// 사용자 학습 진행 통계.
// `2026-05-08_home-dashboard-redesign.md` §5 따름 (PerGameStat 보강).

import type { LucideIcon } from "lucide-react";
import { games } from "@/lib/games/registry";
import { loadAllSrsStates } from "../storage/srs";
import { loadStreak, type StreakState } from "../streak";

export interface PerGameStat {
  gameId: string;
  title: string;
  cardsTouched: number;
  cardsTotal: number;
  attempts: number;
  /** 정답 횟수 (성공) — UI 큰 숫자. */
  correct: number;
  /** 오답 횟수 (실패) = lapses 합. UI 큰 숫자. */
  failed: number;
  /** 0~1, attempts 0 이면 0 */
  accuracy: number;
  lastReviewAt?: Date;
  /** 게임 분류 — 홈/허브 분리 표시. */
  kind: "official" | "custom";
  /** lucide 아이콘. */
  icon: LucideIcon;
}

export interface DashboardStats {
  /**
   * 카드를 한 번이라도 본 적 있는 게임 수 — **전체 games 기준**(보관 게임 직접 URL 플레이 포함).
   * 실제 학습 이력 총계. /home 노출 판정엔 쓰지 말 것(아래 `visibleGamesPlayed` 사용).
   */
  gamesPlayed: number;
  /**
   * 카드를 본 적 있는 **노출(visible) 게임 수** — 보관(stage:"high") 제외.
   * /home 헤더("N개 게임 만났어요")·EmptyDashboard 판정용 — `perGame`(노출 카드 목록)과
   * 동일 기준이라 "N개 만났다는데 활동 목록은 빈" 비정합을 차단(Codex #125 R8).
   */
  visibleGamesPlayed: number;
  /** 풀이 시도 총합 (모든 게임 reps 합). */
  totalAttempts: number;
  /** 정답 횟수 (attempts - lapses). */
  totalCorrect: number;
  /** 실패 횟수 (lapses 합). */
  totalLapses: number;
  /** 0~1, 0 이면 0. */
  accuracy: number;
  /** 오늘 자정 이후 카드를 만진 횟수 (unique cards 수). */
  todayAttempts: number;
  /** due 가 24h 이내 (이미 due 포함) 인 카드 수. */
  dueSoonCount: number;
  /** 일일 학습 스트릭 — 단일 백본 (사용자 단위, 게임 무관).
   *  plan 2026-05-15_fsrs-streak-backbone Phase 2 통합. */
  streak: StreakState;
  /** 게임별 분해. registry 순서. */
  perGame: PerGameStat[];
}

/** 동적 import 로 게임 content 카드 총 수 측정. */
async function getCardsTotal(gameId: string): Promise<number> {
  try {
    const mod = (await import(`@/games/${gameId}/content`)) as {
      cards?: unknown[];
    };
    return Array.isArray(mod.cards) ? mod.cards.length : 0;
  } catch {
    return 0;
  }
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** 모든 게임 통계 계산 — CSR 전용 (window.localStorage 의존). */
export async function computeDashboardStats(
  now: Date = new Date(),
): Promise<DashboardStats> {
  const perGame: PerGameStat[] = [];
  let totalAttempts = 0;
  let totalLapses = 0;
  let todayAttempts = 0;
  let dueSoonCount = 0;
  let gamesPlayed = 0;
  let visibleGamesPlayed = 0;

  // 학습 집계는 전체 games 기준 — 보관(stage:"high") 게임도 직접 URL 로 플레이 가능하므로
  // 그 SRS/활동 기록은 총계에 포함돼야 한다(노출 숨김 ≠ 학습 기록 제외). Codex #125.
  for (const g of games) {
    const cardsTotal = await getCardsTotal(g.meta.id);
    const states = loadAllSrsStates(g.meta.id);

    let cardsTouched = 0;
    let attempts = 0;
    let lapses = 0;
    let lastReviewAt: Date | undefined;

    for (const state of states.values()) {
      if (state.reviewCount > 0) {
        cardsTouched += 1;
        attempts += state.fsrsCard.reps;
        lapses += state.fsrsCard.lapses;

        if (state.lastReviewAt) {
          if (!lastReviewAt || state.lastReviewAt > lastReviewAt) {
            lastReviewAt = state.lastReviewAt;
          }
          if (isToday(state.lastReviewAt)) {
            todayAttempts += 1;
          }
        }
      }

      // 미리뷰 카드(reviewCount === 0)는 createEmptyCard(now).due === now 라서
      // 모든 미리뷰가 due-soon 으로 잡힘 → "다시 만날 N장" 부풀려짐.
      // 실제 리뷰된 카드만 dueSoonCount 에 포함.
      const due = state.fsrsCard.due;
      if (
        state.reviewCount > 0 &&
        due &&
        due.getTime() - now.getTime() <= TWENTY_FOUR_HOURS_MS
      ) {
        dueSoonCount += 1;
      }
    }

    // 단일 FSRS 백본 — 학습 이력 magnitude 는 보관 여부와 무관하게 전체 games 기준(Codex #125
    // R1·R4). `gamesPlayed`(실제 플레이 게임 수, /home empty 판정)·totalAttempts/Lapses(및 위
    // todayAttempts/dueSoonCount)는 보관 게임을 직접 URL 로 플레이한 기록도 누락 없이 반영한다.
    if (cardsTouched > 0) gamesPlayed += 1;

    // 단, `perGame`(=/home CompactActivity 카드 목록 — **노출/발견 표면**)만 보관(stage:"high")
    // 제외 → 허브·about 에서 숨긴 고등 게임이 대시보드 카드로 재노출되지 않게(Codex #125 R2).
    // (헤더 magnitude 와 카드 목록의 기준 차이는 보관 게임만 플레이한 degenerate 케이스에서만
    //  발생 — 단일 백본 보존을 우선해 magnitude 는 전체 유지.)
    if (g.meta.stage !== "high") {
      if (cardsTouched > 0) visibleGamesPlayed += 1; // /home 헤더·empty 판정 — perGame 과 동일 기준
      const correct = Math.max(0, attempts - lapses);
      perGame.push({
        gameId: g.meta.id,
        title: g.meta.title,
        cardsTouched,
        cardsTotal,
        attempts,
        correct,
        failed: lapses,
        accuracy: attempts > 0 ? correct / attempts : 0,
        lastReviewAt,
        kind: g.meta.kind ?? "official",
        icon: g.meta.icon,
      });
    }

    totalAttempts += attempts;
    totalLapses += lapses;
  }

  const totalCorrect = Math.max(0, totalAttempts - totalLapses);

  return {
    gamesPlayed,
    visibleGamesPlayed,
    totalAttempts,
    totalCorrect,
    totalLapses,
    accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
    todayAttempts,
    dueSoonCount,
    streak: loadStreak(),
    perGame,
  };
}
