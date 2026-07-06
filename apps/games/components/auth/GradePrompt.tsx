// 홈 진입 시 학년 수집 모달 — pullim 모드 회원이 학년(games projection) 미보유면 노출.
// 게스트 StartForm 재사용 불가(게스트 온보딩 전용)라 회원용 별도 UX(사용자 결정: 홈 모달).
// 근거: spec/05 §5.2⒜⑵(grade games-side), plan §2-D P-A⑵. GET/POST /api/pullim/grade 소비.
// 닫기(다음에) 가능 — dismiss 는 이 세션만(sessionStorage), 다음 세션/로그인 시 재노출.
"use client";

import { useEffect, useState } from "react";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";
import { useIdentity } from "@/lib/core/player/use-identity";
import { getPullimGrade, setPullimGrade } from "@/lib/auth/client";
import { GRADES, type Grade } from "@/lib/core/player";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pullim-games:grade-prompt-dismissed";

export function GradePrompt() {
  const { ready, authUser } = useIdentity();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Grade | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // pullim 모드 회원 + 이 세션 미dismiss 일 때만 grade 보유 확인. 게스트·legacy·비활성은 no-op.
    if (!PULLIM_MODE || !ready || !authUser) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) return;
    let cancelled = false;
    getPullimGrade().then((r) => {
      // r null(비활성·미인증·장애) → 노출 안 함. grade null(미보유) → 노출.
      if (!cancelled && r && r.grade === null) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authUser]);

  if (!open) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1"); // 이 세션만 — 다음 세션/로그인 시 재노출.
    } catch {
      /* sessionStorage 불가 무시 */
    }
    setOpen(false);
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
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-md border border-pullim-slate-200 bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="grade-prompt-title" className="text-lg font-bold text-type-primary">
          학년을 알려주세요
        </h2>
        <p className="mt-1.5 text-sm text-type-secondary">
          학년에 맞는 문제를 보여드릴게요. 나중에 계정 메뉴에서 바꿀 수 있어요.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2" role="group" aria-label="학년 선택">
          {GRADES.map((g) => (
            <button
              key={g}
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
