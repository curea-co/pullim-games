// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ saved: vi.fn(), mode: "default" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/games/test",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/core", async (original) => ({
  ...(await original<object>()),
  useGameMode: () => state.mode,
  loadAllSrsStates: () => new Map(),
  logEvent: vi.fn(),
  applyAndPersist: state.saved,
}));
vi.mock("@/components/ui/CorrectBurst", () => ({ CorrectBurst: () => null }));
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  state.saved.mockClear();
  state.mode = "default";
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
const label = (e: Element) =>
  e.getAttribute("aria-label") ?? e.textContent?.trim() ?? "";
function button(name: string | RegExp) {
  const el = [
    ...host.querySelectorAll<HTMLElement>('button,[role="button"]'),
  ].find((e) =>
    typeof name === "string" ? label(e) === name : name.test(label(e)),
  );
  if (!el) throw Error(`Missing button ${name}: ${host.textContent}`);
  return el;
}
async function click(name: string | RegExp) {
  const el = button(name);
  expect(el.hasAttribute("disabled")).toBe(false);
  await act(async () => el.click());
}
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
}
async function step(name: string, from: number, to: number) {
  for (let i = 0; i < Math.abs(to - from); i++)
    await click(`${name} ${to > from ? "증가" : "감소"}`);
}
function controls() {
  return [...host.querySelectorAll('button,[role="button"],input')].map(
    (e) => ({
      label: label(e),
      disabled: e.hasAttribute("disabled"),
      pressed: e.getAttribute("aria-pressed"),
      selected: e.getAttribute("aria-selected"),
      value: e instanceof HTMLInputElement ? e.value : null,
    }),
  );
}
// Existing content is read-only fixture data; only the isolated component receives one card.
async function solve(id: string, c: any) {
  const p = c.problem;
  switch (id) {
    case "english-order":
      for (const w of p.english) await click(w);
      break;
    case "history-timeline":
      for (const e of [...p.events].sort((a, b) => a.year - b.year))
        await click(e.title);
      break;
    case "cloze-multi":
    case "letter-assembly":
    case "image-hotspot":
      for (const [i, s] of (p.blanks ?? p.slots ?? p.regions).entries()) {
        const choice = p.cards.find(
          (c: { id: string }) => c.id === s.correctCardId,
        );
        const el = [
          ...host.querySelectorAll<HTMLElement>('[role="toolbar"] button'),
        ].find((e) => e.textContent?.includes(choice.text))!;
        await act(async () => el.click());
        await click(
          new RegExp(
            `^${id === "cloze-multi" ? `빈칸 ${s.id}` : `${id === "letter-assembly" ? "슬롯" : "영역"} ${i + 1}`}[ ,]`,
          ),
        );
      }
      await click("정답 확인");
      break;
    case "korean-pos-tagging":
      for (const [i, t] of p.tokens.entries()) {
        await click(new RegExp(`^${i + 1}번 토큰 `));
        await click(`품사 ${t.pos} 선택`);
      }
      await click("정답 확인");
      break;
    case "chemistry-balance":
      for (const m of [...p.reactants, ...p.products])
        await step(`${m.formula} 계수`, 1, m.coefficient);
      await click("균형 확인");
      break;
    case "genetics-punnett":
      for (const [i, n] of p.expectedRatio.entries())
        for (let j = 0; j < n; j++) {
          const b = [
            ...host.querySelectorAll<HTMLButtonElement>("button"),
          ].filter((e) => / 비율 증가$/.test(label(e)))[i]!;
          await act(async () => b.click());
        }
      await click("정답 확인");
      break;
    case "math-graph-shift":
      await step("a (계수)", 1, p.targetA);
      await step("h (가로)", 0, p.targetH);
      await step("k (세로)", 0, p.targetK);
      await click("확인");
      break;
    case "physics-vector":
      await step("rx (가로 성분)", 1, p.resultant.components[0]);
      await step("ry (세로 성분)", 0, p.resultant.components[1]);
      await click("확인");
      break;
    case "bio-taxonomy":
      for (const item of p.items) {
        const source = button(`카드 ${item.label}, 카테고리로 드래그`);
        await act(async () =>
          source.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          ),
        );
        await click(
          `${p.categories.find((c: { id: string; label: string }) => c.id === item.categoryId).label}에 배치`,
        );
      }
      await click("정답 확인");
      break;
    case "factorization":
      await click(`공통인수 ${p.commonFactor} 선택`);
      break;
  }
  await tick();
}
const ids = [
  "bio-taxonomy",
  "chemistry-balance",
  "cloze-multi",
  "english-order",
  "factorization",
  "genetics-punnett",
  "history-timeline",
  "image-hotspot",
  "korean-pos-tagging",
  "letter-assembly",
  "math-graph-shift",
  "physics-vector",
];
const fixtures = new Map<string, unknown[]>();
for (const id of ids)
  for (const outcome of ["correct", "reveal"])
    it(`${id}: 한 장 ${outcome} 재시도는 배치와 시도 상태를 비우고 다시 채점한다`, async () => {
      const content = await vi.importActual<{
        getCardSequence: () => unknown[];
      }>(`../../games/${id}/content`);
      const cards = content.getCardSequence().slice(0, 1);
      fixtures.set(id, cards);
      vi.doMock(`../../games/${id}/content`, () => ({
        getCardSequence: () => fixtures.get(id),
      }));
      const Game = (await import(`../../games/${id}/component`)).default;
      await act(async () => root.render(<Game />));
      await tick();
      const initial = controls();
      if (outcome === "correct") await solve(id, cards[0]);
      else await reveal(id, cards[0]);
      // These two existing games persist every submission, including each wrong attempt.
      const savedBeforeRetry =
        outcome === "reveal" &&
        ["english-order", "history-timeline"].includes(id)
          ? 5
          : 1;
      expect(state.saved).toHaveBeenCalledTimes(savedBeforeRetry);
      await click(/^(마치기|다음)/);
      await click("한 번 더 풀어볼까요");
      await tick();
      expect(host.querySelector('[data-testid="game-shell"]')).not.toBeNull();
      expect(controls()).toEqual(initial);
      expect(state.saved).toHaveBeenCalledTimes(savedBeforeRetry);
      await solve(id, cards[0]);
      expect(state.saved).toHaveBeenCalledTimes(savedBeforeRetry + 1);
      expect(state.saved.mock.calls.at(-1)![3]).toMatchObject({
        correct: true,
        wrongCount: 0,
        hintUsed: false,
      });
    });

async function typeAnswer(value: string) {
  const input = host.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("확인");
  await tick();
}
for (const kind of ["Typing", "WordMatch", "QuickQuiz", "Blank"])
  for (const count of [1, 2])
    for (const outcome of ["correct", "reveal"]) {
      it(`${kind}: ${count}장 ${outcome} 후 재시도 입력·힌트·시도·시간 초기화`, async () => {
        state.mode = "time-attack";
        const module = await import(`./${kind}Component`);
        const Component: React.ElementType = module[`${kind}Component`];
        const problem =
          kind === "Typing"
            ? { meaning: "사과", answer: "apple" }
            : kind === "WordMatch"
              ? {
                  pairs: [{ left: "apple", right: "사과" }],
                  extras: { left: [], right: ["배"] },
                }
              : {
                  question: "1+1",
                  passage: "1+1=___",
                  choices: ["2", "3"],
                  correctIndex: 0,
                };
        const cards = Array.from({ length: count }, (_, i) => ({
          id: `retry-${i}`,
          unit: "test",
          hint: "도움말",
          problem,
        }));
        await act(async () =>
          root.render(
            <Component
              gameId="test"
              cards={cards}
              completionMessage={() => "완료"}
            />,
          ),
        );
        const initial = controls();
        const answer = async (wrong = false) => {
          if (kind === "Typing") await typeAnswer(wrong ? "wrong" : "apple");
          else if (kind === "WordMatch") {
            await click("apple");
            await click(wrong ? "배" : "사과");
            await tick();
          } else {
            await click(wrong ? "3" : "2");
            await tick();
          }
        };
        for (let i = 0; i < count; i++) {
          if (kind === "Typing") await click("힌트");
          const attempts =
            outcome === "reveal" && ["Typing", "WordMatch"].includes(kind)
              ? 5
              : 1;
          for (let j = 0; j < attempts; j++) await answer(outcome === "reveal");
          await click(/^(마치기|다음)/);
        }
        expect(state.saved).toHaveBeenCalledTimes(count);
        await tick();
        await click("한 번 더 풀어볼까요");
        expect(host.querySelector('[data-testid="game-shell"]')).not.toBeNull();
        expect(controls()).toEqual(initial);
        expect(
          host.querySelector('[data-testid="time-attack-seconds"]')
            ?.textContent,
        ).toBe("30s");
        await answer();
        expect(state.saved).toHaveBeenCalledTimes(count + 1);
        const saved = state.saved.mock.calls.at(-1)![3];
        expect(saved.wrongCount).toBe(0);
        expect(saved.hintUsed).toBe(false);
        expect(saved.elapsedMs).toBeLessThan(2000);
      });
    }

it("WordMatch: 마지막 정답 직후 완료해도 이전 피드백이 완료 화면을 덮지 않는다", async () => {
  const { WordMatchComponent } = await import("./WordMatchComponent");
  await act(async () =>
    root.render(
      <WordMatchComponent
        gameId="test"
        cards={[
          {
            id: "one",
            unit: "test",
            problem: { pairs: [{ left: "apple", right: "사과" }] },
          },
        ]}
        completionMessage={() => "완료"}
      />,
    ),
  );
  await click("apple");
  await click("사과");
  await click(/^(마치기|다음)/);
  await tick();
  expect(button("한 번 더 풀어볼까요")).toBeTruthy();
  await click("한 번 더 풀어볼까요");
  await tick();
  expect(button("apple").hasAttribute("disabled")).toBe(false);
});

// Deliberately wrong learner actions; production grading remains unchanged.
async function reveal(id: string, card: any) {
  const wrong = structuredClone(card),
    p = wrong.problem;
  if (id === "english-order")
    [p.english[0], p.english[1]] = [p.english[1], p.english[0]];
  else if (id === "history-timeline")
    [p.events[0].year, p.events[1].year] = [p.events[1].year, p.events[0].year];
  else if (id === "korean-pos-tagging")
    p.tokens[0].pos = p.tokens[0].pos === "명사" ? "동사" : "명사";
  else if (id === "bio-taxonomy")
    p.items[0].categoryId = p.categories.find(
      (c: { id: string }) => c.id !== p.items[0].categoryId,
    ).id;
  else if (id === "letter-assembly") {
    const expected = p.cards.find((c: { id: string }) => c.id === p.slots[0].correctCardId);
    p.slots[0].correctCardId = p.cards.find((c: { id: string; text: string }) => c.text !== expected.text && !p.slots.some((slot: { correctCardId: string }) => slot.correctCardId === c.id)).id;
  }
  else if (["cloze-multi", "image-hotspot"].includes(id)) {
    const slots = p.blanks ?? p.slots ?? p.regions;
    [slots[0].correctCardId, slots[1].correctCardId] = [
      slots[1].correctCardId,
      slots[0].correctCardId,
    ];
  }
  if (id === "genetics-punnett") {
    const b = [...host.querySelectorAll<HTMLButtonElement>("button")].filter(
      (e) => / 비율 증가$/.test(label(e)),
    )[1]!;
    await act(async () => b.click());
  }
  for (let i = 0; i < 5; i++) {
    if (id === "factorization") {
      const b = [
        ...host.querySelectorAll<HTMLButtonElement>("[data-chip-text]"),
      ].find((e) => e.dataset.chipText !== card.problem.commonFactor)!;
      await act(async () => b.click());
    } else if (
      ["english-order", "history-timeline"].includes(id) ||
      (i === 0 &&
        [
          "bio-taxonomy",
          "korean-pos-tagging",
          "cloze-multi",
          "letter-assembly",
          "image-hotspot",
        ].includes(id))
    )
      await solve(id, wrong);
    else await click(/^(정답 확인|균형 확인|확인)$/);
    await tick();
  }
  expect(host.textContent).toContain("여러 번 시도했어요");
}

it("WordMatch: 필수 짝 완료 후에도 남은 보너스 짝을 맞출 수 있다", async () => {
  const { WordMatchComponent } = await import("./WordMatchComponent");
  await act(async () =>
    root.render(
      <WordMatchComponent
        gameId="test"
        cards={[
          {
            id: "bonus",
            unit: "test",
            problem: {
              pairs: [{ left: "apple", right: "사과" }],
              extras: { left: ["pear"], right: ["배"] },
            },
          },
        ]}
        completionMessage={() => "완료"}
      />,
    ),
  );
  await click("apple");
  await click("사과");
  await tick();
  await click("pear");
  await click("배");
  await tick();
  expect(host.textContent).toContain("보너스 1 / 1");
});

it("Typing: 재시도 후 마운트된 입력에 포커스한다", async () => {
  const { TypingComponent } = await import("./TypingComponent");
  await act(async () =>
    root.render(
      <TypingComponent
        gameId="test"
        cards={[
          {
            id: "focus",
            unit: "test",
            problem: { meaning: "사과", answer: "apple" },
          },
        ]}
        completionMessage={() => "완료"}
      />,
    ),
  );
  await typeAnswer("apple");
  await click(/^(마치기|다음)/);
  button("한 번 더 풀어볼까요").focus();
  await click("한 번 더 풀어볼까요");
  expect(document.activeElement).toBe(host.querySelector("input"));
});
