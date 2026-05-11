"use client";

// 메커닉별 자료 입력 형식 안내 + 예시 자동 채우기.

import type { CustomCardKind } from "@/lib/core";
import { cn } from "@/lib/utils";

export const EXAMPLES: Record<CustomCardKind, string> = {
  "multiple-choice": `Q: 2x + 4 의 인수분해는?
A) x(2 + 4)
B) 2(x + 2)
C) 2x + 4
D) (x+2)(x-2)
정답: B

Q: x² + 5x + 6 의 인수분해는?
A) (x+2)(x+3)
B) (x+1)(x+6)
C) (x-2)(x-3)
D) x(x+5)+6
정답: A`,
  blank: `Reading widely is one of the most effective ways to improve your vocabulary. The more you read, the more new words you [encounter|ignore|remember|copy], often without even noticing.
해설: 새 단어를 자연스럽게 만나는 맥락 → encounter

Many scientists once believed that emotions were [opposed|related|similar|identical] to logical thinking.`,
  typing: `모순::앞뒤가 서로 맞지 않는 일::矛盾
일거양득::한 가지 일로 두 가지 이익::一擧兩得
절치부심::이를 갈며 마음을 썩임`,
  "word-match": `pursue::추구하다
contradict::모순되다
perceive::인식하다
distinguish::구별하다
regulate::조절하다`,
};

const RULES: Record<CustomCardKind, { title: string; bullets: string[] }> = {
  "multiple-choice": {
    title: "객관식 — 블록 단위 (빈 줄로 구분)",
    bullets: [
      "Q: 질문 (한 줄)",
      "A) ~ D) 보기 4개 (각 한 줄)",
      "정답: A/B/C/D 중 하나",
      "블록 1개 = 카드 1장",
    ],
  },
  blank: {
    title: "빈칸 — 단락 단위 (빈 줄로 구분)",
    bullets: [
      "본문 안에 [정답|오답1|오답2|오답3] 마커 1개",
      "마커 안 보기 4개, 첫 항목이 정답",
      "선택: 단락 끝에 '해설: ...' 라인 추가",
      "단락 1개 = 카드 1장",
    ],
  },
  typing: {
    title: "타이핑 — 한 줄에 1 카드",
    bullets: [
      "정답::뜻 (또는 TAB 으로 구분)",
      "선택: 정답::뜻::한자표기",
      "줄 1개 = 카드 1장",
    ],
  },
  "word-match": {
    title: "매칭 — 한 줄에 1 짝, 5 짝 묶음",
    bullets: [
      "왼쪽::오른쪽 (또는 TAB)",
      "5 짝씩 카드 1장 (잔여는 직전 카드에 합침, 최대 8 짝)",
      "최소 4 짝부터 카드 생성",
    ],
  },
};

interface Props {
  kind: CustomCardKind;
  onFillExample?: () => void;
  className?: string;
}

export function SourceFormatGuide({ kind, onFillExample, className }: Props) {
  const rule = RULES[kind];
  return (
    <section
      aria-label="자료 형식 안내"
      className={cn(
        "rounded-block border border-border-hairline bg-bg-block p-3",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-helper font-bold text-type-primary">
          {rule.title}
        </h3>
        {onFillExample && (
          <button
            type="button"
            onClick={onFillExample}
            className="text-helper text-type-secondary hover:text-type-primary"
          >
            예시 채우기 →
          </button>
        )}
      </header>
      <ul className="mt-2 flex flex-col gap-0.5 text-helper text-type-secondary">
        {rule.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span aria-hidden="true">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
