"use client";

// 사이드바(레일) 접기/펼치기 토글 — pullim-web src/components/os/RailCollapseToggle.tsx 이식.
// `.os-root` 에 `rail-collapsed` 클래스를 붙여 CSS 가 레일을 숨기고 본문을 넓힌다. localStorage 지속.
//
// ⚠️ localStorage 쓰기는 **클릭 핸들러에서만**. effect 에서 쓰면 마운트 시 초기 false 로 저장값을
// 덮어써 StrictMode 이중호출된 복원 effect 가 덮인 값을 다시 읽어 접힘이 풀리는 버그가 있었다.
import { useEffect, useState } from "react";

const KEY = "pullim-games:rail-collapsed";

export function RailCollapseToggle() {
  const [collapsed, setCollapsed] = useState(false);

  // 마운트 시 저장값 복원(읽기만).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  // collapsed → .os-root 클래스 동기화(순수 DOM 반영, 멱등).
  useEffect(() => {
    document.querySelector(".os-root")?.classList.toggle("rail-collapsed", collapsed);
  }, [collapsed]);

  const onToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  return (
    <button
      type="button"
      className="rail-collapse-btn"
      aria-pressed={collapsed}
      aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    </button>
  );
}
