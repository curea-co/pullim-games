"use client";

import { useEffect, useRef, type RefObject } from "react";

// 풀이 화면 공용 키보드 단축키 — Enter 키로 "확인"·"다음" CTA 를 마우스 없이 발동.
// 두 가지 패턴:
//   1) active+handler — 4 메커니즘처럼 phase 가 명확히 갈리는 컴포넌트.
//   2) ref 기반 — handleCheck/handleNext 가 early return 뒤 정의된 직접 게임 12종.
//      ref 가 가리키는 button 의 disabled 상태를 그대로 따라가서 게임별 활성화 조건을
//      재기술할 필요 없음.

function shouldSkipForTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const input = target as HTMLInputElement;
    // disabled 가 아니면 input 의 자체 onKeyDown 이 우선
    return !input.disabled;
  }
  // 포커스된 button/a 는 브라우저 기본 click 동작이 이미 수행
  if (tag === "BUTTON" || tag === "A") return true;
  return false;
}

function isImeComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229;
}

export function useEnterToAdvance(active: boolean, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (isImeComposing(e)) return;
      if (shouldSkipForTarget(e.target)) return;
      e.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

export function useEnterClicksRef(
  ref: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (isImeComposing(e)) return;
      if (shouldSkipForTarget(e.target)) return;
      const btn = ref.current;
      if (!btn || btn.disabled) return;
      e.preventDefault();
      btn.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}
