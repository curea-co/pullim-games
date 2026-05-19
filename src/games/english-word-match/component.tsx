"use client";

// 영단어 매칭 — 영어 ↔ 한국어 짝 맞추기.
// 한쪽 탭 → 하이라이트, 반대쪽 탭 → 매칭 시도. 짝 맞으면 fade-out, 틀리면 shake.
// 카드 1장의 모든 짝 매칭 시 다음. 오답 발생 횟수에 따라 FSRS rating 분기.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell } from "@/components/game-shell";
import { getCardSequence } from "./content";
import {
  applyAndPersist,
  loadAllSrsStates,
  loadSrsState,
  logEvent,
  selectNextCards,
} from "@/lib/core";

const GAME_ID = "english-word-match";
type Phase = "playing" | "wrong-flash" | "completed";

interface SideItem {
  pairIndex: number;
  text: string;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  function next(): number {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0x100000000;
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export default function EnglishWordMatchGame() {
  const [cards, setCards] = useState(() => getCardSequence());
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selectedEn, setSelectedEn] = useState<number | null>(null);
  const [selectedKo, setSelectedKo] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{ en: number; ko: number } | null>(
    null,
  );
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    const all = loadAllSrsStates(GAME_ID);
    const allCards = getCardSequence();
    if (all.size > 0) {
      const withSrs = allCards.map((c) => ({
        card: c,
        srs: all.get(c.id) ?? loadSrsState(GAME_ID, c.id),
      }));
      const ordered = selectNextCards(withSrs, allCards.length).map(
        (x) => x.card,
      );
      setCards(ordered);
    }
    void logEvent({ gameId: GAME_ID, cardId: null, action: "session-start" });
    return () => {
      void logEvent({ gameId: GAME_ID, cardId: null, action: "session-end" });
    };
  }, []);

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;

  // extras 도 본 pairs 와 동일하게 양수 pairIndex 부여 (pairs.length 부터).
  // 영어 extras[i] ↔ 한국어 extras[i] 는 의미상 정답 짝이며, 그 매칭을 정답으로 인정.
  // 통과 조건은 본 pairs 5개 매칭이지만, 사용자가 남은 2개도 매칭하려 하면 자연스럽게 정답 처리.
  const englishItems: SideItem[] = useMemo(() => {
    if (!card) return [];
    const pairs = card.problem.pairs.map((p, i) => ({
      pairIndex: i,
      text: p.english,
    }));
    const extras = (card.problem.extras?.english ?? []).map((text, i) => ({
      pairIndex: card.problem.pairs.length + i,
      text,
    }));
    return seededShuffle([...pairs, ...extras], `${card.id}-en`);
  }, [card]);

  const koreanItems: SideItem[] = useMemo(() => {
    if (!card) return [];
    const pairs = card.problem.pairs.map((p, i) => ({
      pairIndex: i,
      text: p.korean,
    }));
    const extras = (card.problem.extras?.korean ?? []).map((text, i) => ({
      pairIndex: card.problem.pairs.length + i,
      text,
    }));
    return seededShuffle([...pairs, ...extras], `${card.id}-ko`);
  }, [card]);

  useEffect(() => {
    setMatched(new Set());
    setSelectedEn(null);
    setSelectedKo(null);
    setWrongFlash(null);
    setWrongCount(0);
    setPhase("playing");
  }, [cardIndex]);

  if (phase === "completed") {
    return (
      <CompletionScreen
        totalCards={cards.length}
        onRetry={() => {
          setCardIndex(0);
          void logEvent({
            gameId: GAME_ID,
            cardId: null,
            action: "session-start",
            payload: { retry: true },
          });
        }}
      />
    );
  }

  if (!card) return null;

  function tryMatch(enPair: number, koPair: number) {
    if (enPair === koPair) {
      const next = new Set(matched);
      next.add(enPair);
      setMatched(next);
      setSelectedEn(null);
      setSelectedKo(null);
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "transform",
        payload: { pairIndex: enPair, correct: true },
      });
      // 카드 완료
      if (next.size === card!.problem.pairs.length) {
        applyAndPersist("default", GAME_ID, card!.id, {
          correct: true,
          wrongCount,
          hintUsed: false,
        });
        void logEvent({
          gameId: GAME_ID,
          cardId: card!.id,
          action: "submit",
          payload: { wrongCount },
        });
      }
    } else {
      setWrongFlash({ en: enPair, ko: koPair });
      setWrongCount((w) => w + 1);
      void logEvent({
        gameId: GAME_ID,
        cardId: card!.id,
        action: "transform",
        payload: { enPair, koPair, correct: false },
      });
      setPhase("wrong-flash");
      setTimeout(() => {
        setSelectedEn(null);
        setSelectedKo(null);
        setWrongFlash(null);
        setPhase("playing");
      }, 600);
    }
  }

  function handleEnglishTap(pairIndex: number) {
    if (phase !== "playing") return;
    if (matched.has(pairIndex)) return;
    if (selectedKo !== null) {
      tryMatch(pairIndex, selectedKo);
      return;
    }
    setSelectedEn(pairIndex === selectedEn ? null : pairIndex);
  }

  function handleKoreanTap(pairIndex: number) {
    if (phase !== "playing") return;
    if (matched.has(pairIndex)) return;
    if (selectedEn !== null) {
      tryMatch(selectedEn, pairIndex);
      return;
    }
    setSelectedKo(pairIndex === selectedKo ? null : pairIndex);
  }

  function handleNext() {
    if (isLastCard) {
      setPhase("completed");
      return;
    }
    setCardIndex(cardIndex + 1);
  }

  // 본 pairs 매칭이 통과 조건. extras 추가 매칭 후 matched.size 가 늘어나도 다음 버튼은 유지.
  const allMatched = matched.size >= card.problem.pairs.length;

  return (
    <GameShell
      variant="match"
      header={
        <div className="flex items-center justify-between text-label tabular text-type-secondary">
          <span>
            {cardIndex + 1} / {cards.length}
          </span>
          <Link
            href="/"
            aria-label="메인으로"
            className="rounded-button px-2 py-1 hover:text-type-primary"
          >
            ≡
          </Link>
        </div>
      }
      content={
        <>
          <p className="mt-3 text-helper text-type-secondary sm:mt-6">{card.unit}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight text-type-primary sm:mt-2 sm:text-display">짝을 맞춰주세요</h1>
          {card.hint && (
            <p className="mt-1 text-helper text-type-secondary">힌트 · {card.hint}</p>
          )}
          <p className="mt-1.5 text-helper tabular text-type-secondary sm:mt-2">
            {(() => {
              const pairsLen = card.problem.pairs.length;
              const extrasLen = card.problem.extras?.english.length ?? 0;
              const matchedRequired = Array.from(matched).filter(
                (pi) => pi < pairsLen,
              ).length;
              const matchedBonus = Array.from(matched).filter(
                (pi) => pi >= pairsLen,
              ).length;
              return (
                <>
                  매칭 {matchedRequired} / {pairsLen}
                  {extrasLen > 0 && ` · 보너스 ${matchedBonus} / ${extrasLen}`}
                  {wrongCount > 0 && ` · 오답 ${wrongCount}`}
                </>
              );
            })()}
          </p>

          <div className="mt-3 grid flex-1 grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
        {/* 영어 컬럼 */}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {englishItems
              .filter((it) => !matched.has(it.pairIndex))
              .map((it) => (
                <motion.button
                  key={it.pairIndex}
                  type="button"
                  onClick={() => handleEnglishTap(it.pairIndex)}
                  disabled={phase !== "playing"}
                  layout
                  exit={{ opacity: 0, scale: 0.85 }}
                  animate={
                    wrongFlash?.en === it.pairIndex
                      ? { x: [0, -4, 4, -4, 4, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.32 }}
                  className={`rounded-block border px-2.5 py-2 text-left text-helper transition-colors sm:px-3 sm:py-3 sm:text-body ${
                    selectedEn === it.pairIndex
                      ? "border-type-primary bg-accent-positive/10 text-type-primary"
                      : wrongFlash?.en === it.pairIndex
                        ? "border-accent-negative bg-accent-negative/10 text-type-primary"
                        : "border-border-hairline bg-bg-block text-type-primary"
                  }`}
                >
                  {it.text}
                </motion.button>
              ))}
          </AnimatePresence>
        </div>

        {/* 한국어 컬럼 */}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {koreanItems
              .filter((it) => !matched.has(it.pairIndex))
              .map((it) => (
                <motion.button
                  key={it.pairIndex}
                  type="button"
                  onClick={() => handleKoreanTap(it.pairIndex)}
                  disabled={phase !== "playing"}
                  layout
                  exit={{ opacity: 0, scale: 0.85 }}
                  animate={
                    wrongFlash?.ko === it.pairIndex
                      ? { x: [0, -4, 4, -4, 4, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.32 }}
                  className={`rounded-block border px-2.5 py-2 text-left text-helper transition-colors sm:px-3 sm:py-3 sm:text-body ${
                    selectedKo === it.pairIndex
                      ? "border-type-primary bg-accent-positive/10 text-type-primary"
                      : wrongFlash?.ko === it.pairIndex
                        ? "border-accent-negative bg-accent-negative/10 text-type-primary"
                        : "border-border-hairline bg-bg-block text-type-primary"
                  }`}
                >
                  {it.text}
                </motion.button>
              ))}
          </AnimatePresence>
        </div>
          </div>
        </>
      }
      cta={
        allMatched ? (
          <button
            type="button"
            onClick={handleNext}
            className="block w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-center text-body text-type-primary transition-colors hover:bg-accent-positive/10"
          >
            {isLastCard ? "마치기 →" : "다음 →"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full rounded-button border border-border-hairline px-4 py-3 text-body text-type-secondary opacity-50"
          >
            다음 →
          </button>
        )
      }
      liveRegion={
        <span className="sr-only" aria-live="polite">
          {allMatched ? "모든 짝이 맞았어요" : "짝을 골라 매칭해주세요"}
        </span>
      }
    />
  );
}

interface CompletionScreenProps {
  totalCards: number;
  onRetry: () => void;
}

function CompletionScreen({ totalCards, onRetry }: CompletionScreenProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-6 py-10">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h1
          className="text-display text-type-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          {totalCards}묶음, 어휘가 박혔어요.
        </motion.h1>
        <p className="text-body text-type-secondary">내일 또 봐요.</p>
      </section>
      <footer className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-button border border-type-primary bg-bg-block px-4 py-3 text-body text-type-primary transition-colors hover:bg-accent-positive/10"
        >
          한 번 더 풀어볼까요
        </button>
        <Link
          href="/"
          className="block w-full rounded-button border border-border-hairline bg-bg-block px-4 py-3 text-center text-body text-type-primary"
        >
          다른 게임
        </Link>
        <Link
          href="/"
          className="block w-full px-4 py-3 text-center text-body text-type-secondary hover:text-type-primary"
        >
          오늘은 끝
        </Link>
      </footer>
    </main>
  );
}
