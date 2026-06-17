"use client";

// 개발자 전용 초기화 버튼.
// 클릭 시 `pullim-games:*` localStorage 키 전체 + sessionStorage 비우고 새로고침
// → 사용자 첫 방문 상태 (fingerprint·streak·SRS·activity-log·custom 콘텐츠·hub view 전부 초기).
// production 빌드에서는 렌더되지 않음.

import { useState } from "react";

const STORAGE_PREFIX = "pullim-games:";

function clearPullimState() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
    window.sessionStorage.clear();
  } catch {
    // localStorage 접근 거부 시 무시 — reload 만 시도
  }
}

export function DevResetButton() {
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (busy) return;
        const ok = window.confirm(
          "초기화: pullim-games 로컬 데이터(fingerprint·streak·SRS·activity-log·custom 콘텐츠·hub view)를 모두 지우고 새로고침합니다. 진행할까요?",
        );
        if (!ok) return;
        setBusy(true);
        clearPullimState();
        window.location.href = "/";
      }}
      disabled={busy}
      aria-label="개발자 초기화 — 첫 방문 상태로 복원"
      title="DEV: 첫 방문 상태로 초기화"
      className="fixed bottom-4 right-4 z-50 inline-flex h-9 items-center gap-1.5 rounded-button border border-pullim-blue-700 bg-pullim-blue-500 px-3 text-helper font-medium text-white shadow-pullim-sm hover:bg-pullim-blue-600 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <polyline points="3 3 3 9 9 9" />
      </svg>
      <span>DEV 초기화</span>
    </button>
  );
}
