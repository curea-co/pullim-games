"use client";

import { useEffect, useRef, type RefObject } from "react";

// 풀이 화면 공용 키보드 단축키 — Enter 키로 "확인"·"다음" CTA 를 마우스 없이 발동.
// 두 가지 패턴:
//   1) active+handler — 4 메커니즘처럼 phase 가 명확히 갈리는 컴포넌트.
//   2) ref 기반 — handleCheck/handleNext 가 early return 뒤 정의된 직접 게임 12종.
//      ref 가 가리키는 button 의 disabled 상태를 그대로 따라가서 게임별 활성화 조건을
//      재기술할 필요 없음.

// ARIA 인터랙티브 role — Enter/Space 키 자체 동작이 의도된 커스텀 포커스 요소.
// 예: bio-taxonomy 의 ItemCard (role="button" + tabIndex={0}) — SPEC 04 §4.7
// "키보드 네비게이션: Tab 선택 / Space·Enter 잡기" 의미론 보호.
const INTERACTIVE_ROLE_SELECTOR =
  '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="option"], [role="switch"]';

function shouldSkipForTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const input = target as HTMLInputElement;
    // disabled 가 아니면 input 의 자체 onKeyDown 이 우선
    return !input.disabled;
  }
  // 포커스된 button/a 는 브라우저 기본 click 동작이 이미 수행
  if (tag === "BUTTON" || tag === "A") return true;
  // contentEditable 영역에서는 Enter 가 줄바꿈 등 자체 동작
  if (target.isContentEditable) return true;
  // ARIA interactive role — closest 까지 보는 이유: role="button" 컨테이너 안의
  // span 등 후손이 focus 받을 수 있고, 어느 경우든 자체 키 핸들러가 우선.
  if (target.closest(INTERACTIVE_ROLE_SELECTOR)) return true;
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
      // 키 반복(누르고 있을 때 OS 가 발사하는 연속 keydown) 무시 —
      // 결과 화면에서 Enter 로 다음 카드 진입 후 키 떼기 전까지의 연속 이벤트가
      // 새 카드의 풀이/제출을 자동으로 통과시키는 회귀 차단.
      if (e.repeat) return;
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
      // 키 반복(Enter hold) 무시 — 동일 회귀(다음 카드 mount 직후 onclick 자동 발사) 차단.
      if (e.repeat) return;
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
