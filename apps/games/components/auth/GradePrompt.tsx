// 홈 진입 시 학년 수집 모달 — pullim 모드 회원이 학년(games projection) 미보유면 노출.
// 게스트 StartForm 재사용 불가(게스트 온보딩 전용)라 회원용 별도 UX(사용자 결정: 홈 모달).
// 근거: spec/05 §5.2⒜⑵(grade games-side), plan §2-D P-A⑵. GET/POST /api/pullim/grade 소비.
// 닫기(다음에) 가능 — dismiss 는 이 세션만(sessionStorage), 다음 세션/로그인 시 재노출.
"use client";

import { useEffect, useRef, useState } from "react";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";
import { useIdentity } from "@/lib/core/player/use-identity";
import { getPullimGrade, setPullimGrade } from "@/lib/auth/client";
import { GRADES, type Grade } from "@/lib/core/player";
import { Button } from "@/components/ui/button";

// dismiss 는 **사용자별**(authUser.id=sub)로 분리한다(Codex #147) — 같은 탭에서 A 가 "다음에" 후
// 로그아웃하고 B 가 로그인하면 B 는 자기 key 가 없어 프롬프트가 다시 뜬다(A dismiss 상속 방지).
const dismissKeyFor = (userId: string) => `pullim-games:grade-prompt-dismissed:${userId}`;

// sessionStorage 읽기/쓰기 — 차단 환경(웹뷰·프라이버시)에서 SecurityError 나므로 try/catch.
// 실패 시 세션 메모리(모듈 Set, 사용자별)로 폴백해 홈 진입 effect 가 터지지 않게 한다.
const dismissedMemory = new Set<string>();
function isDismissed(userId: string): boolean {
  if (dismissedMemory.has(userId)) return true;
  try {
    return sessionStorage.getItem(dismissKeyFor(userId)) === "1";
  } catch {
    return false; // storage 차단 = "판정 불가" → 미dismiss 로 진행(안전).
  }
}
function markDismissed(userId: string): void {
  dismissedMemory.add(userId); // storage 실패해도 이 세션 재노출 방지(메모리 폴백).
  try {
    sessionStorage.setItem(dismissKeyFor(userId), "1");
  } catch {
    /* storage 차단 무시 — 메모리 폴백으로 이 세션은 유지 */
  }
}

export function GradePrompt() {
  const { ready, authUser } = useIdentity();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Grade | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const firstGradeRef = useRef<HTMLButtonElement>(null);

  const userId = authUser?.id ?? null;

  useEffect(() => {
    // pullim 모드 회원 + 이 사용자 미dismiss 일 때만 grade 보유 확인. 게스트·legacy·비활성은 no-op.
    if (!PULLIM_MODE || !ready || !userId) return;
    if (isDismissed(userId)) return;
    let cancelled = false;
    getPullimGrade().then((r) => {
      // r null(비활성·미인증·장애) → 노출 안 함. grade null(미보유) → 노출.
      if (!cancelled && r && r.grade === null) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  // 모달 오픈 시 첫 학년 버튼에 initial focus(키보드 사용자가 모달부터 조작).
  useEffect(() => {
    if (open) firstGradeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    if (userId) markDismissed(userId);
    setOpen(false);
  };

  // focus trap + Escape — role="dialog" 만으론 배경(HomeDashboard)으로 Tab 이 새므로 트랩(Codex #147).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (!busy) dismiss();
      return;
    }
    if (e.key !== "Tab" || !cardRef.current) return;
    const focusable = cardRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const save = async () => {
    if (selected === "" || busy) return;
    setBusy(true);
    setError(false);
    const ok = await setPullimGrade(selected);
    setBusy(false);
    if (ok) setOpen(false);
    else setError(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grade-prompt-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onKeyDown={onKeyDown}
      onClick={() => {
        // 저장 중엔 backdrop dismiss 차단(Codex #147) — 저장이 5xx/네트워크로 실패해도 모달이
        // 이미 닫혀 세션 dismiss 되면 같은 세션 재노출 불가 → 학년 못 저장한 채 진행. busy 중 무시.
        if (!busy) dismiss();
      }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-md border border-pullim-slate-200 bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="grade-prompt-title" className="text-lg font-bold text-type-primary">
          학년을 알려주세요
        </h2>
        <p className="mt-1.5 text-sm text-type-secondary">
          학년에 맞는 문제를 보여드릴게요.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2" role="group" aria-label="학년 선택">
          {GRADES.map((g, i) => (
            <button
              key={g}
              ref={i === 0 ? firstGradeRef : undefined}
              type="button"
              aria-pressed={selected === g}
              onClick={() => setSelected(g)}
              className={
                "h-11 rounded-md border text-sm font-semibold transition-colors " +
                (selected === g
                  ? "border-accent-positive bg-accent-positive text-white"
                  : "border-pullim-slate-300 bg-card text-type-primary hover:bg-pullim-slate-100")
              }
            >
              {g}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-sm text-pullim-danger" role="alert">
            저장하지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={dismiss} disabled={busy}>
            다음에
          </Button>
          <Button type="button" onClick={save} disabled={selected === "" || busy}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
