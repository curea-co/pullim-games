"use client";

// 인수분해 블록 분리 게임 — 첫 등록 게임.
// V1 Phase 1에서 본격 구현. 현재는 라우팅·registry·메인페이지 셸 검증용 placeholder.
// 실제 구현 시 SPEC §03 Screen Spec 및 §04 Interaction State Matrix 따름.

import Link from "next/link";

export default function FactorizationGame() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 py-8">
      {/* 상단 — 진행도 + 종료 (SPEC §04.1 게임 화면 5영역 위계) */}
      <header className="flex items-center justify-between text-label tabular text-type-secondary">
        <span>0 / 5</span>
        <Link
          href="/"
          className="rounded-button px-2 py-1 hover:text-type-primary"
          aria-label="메인으로"
        >
          ≡
        </Link>
      </header>

      {/* 캡션 */}
      <p className="mt-6 text-body text-type-secondary">
        공통인수를 찾아 끌어내세요
      </p>

      {/* 메인 영역 — V1 Phase 1에서 다항식 블록 + 드래그 인터랙션 본격 구현 */}
      <section className="mt-12 flex flex-1 flex-col items-center justify-center">
        <div
          className="rounded-block border border-border-hairline bg-bg-block px-8 py-6 shadow-block"
          aria-label="다항식 2x 제곱 더하기 7x 더하기 3"
        >
          <p className="text-display tabular">2x² + 7x + 3</p>
        </div>

        <p className="mt-12 text-helper text-type-secondary">
          (Week 2 메커닉 코어 구현 예정)
        </p>
      </section>

      {/* 액션 — 정답 후만 활성. placeholder 단계엔 비활성 표시 */}
      <footer className="mt-8">
        <button
          type="button"
          disabled
          className="w-full rounded-button border border-border-hairline px-4 py-3 text-body text-type-secondary opacity-50"
        >
          다음 →
        </button>
      </footer>
    </main>
  );
}
