"use client";

// /manage/billing — 결제 (구독 진입점). V1 placeholder + V2 알림 신청.
// plan: proc/plan/2026-05-18_subscription-cta-entry.md §3 Phase 1
//       + proc/plan/2026-05-19_plan-d-v2-billing-and-sanitize.md §3 Phase 2.
//
// Phase 2 (2026-05-20 정책 갱신 — Codex review fix):
// - hash-only 모델 폐기. 외부 메일 서비스(Resend) 즉시 위임 (SPEC §05.7.5).
// - plain email 을 서버로 보내지만 본 서버는 저장 0 — 라우트가 Resend 위임 후 폐기.

import { useState, type FormEvent } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* layout 의 h1 "내 학습 콘텐츠 만들기" 와 중복 회피 — 본 페이지는 h2 섹션 제목으로.
          Plan A Phase 6 — manage 페이지 h1 단일화 (다른 manage 페이지는 자체 h1 없음). */}
      <header>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-type-primary">
          결제
        </h2>
        <p className="mt-1.5 text-helper text-type-secondary">
          현재 플랜 상태와 곧 출시할 유료 플랜 안내입니다.
        </p>
      </header>

      <CurrentPlanSection />
      <PaidPlanPreview />
      <NotifyForm />
      <PolicyNote />
    </div>
  );
}

function CurrentPlanSection() {
  return (
    <Card className="flex items-start gap-3 p-4">
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-accent-positive"
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-label font-bold text-type-primary">현재 플랜</h3>
        <p className="text-helper text-type-secondary">
          <strong className="text-type-primary">무료</strong> · V1 모든 기능을 자유롭게 이용 중이에요.
        </p>
      </div>
    </Card>
  );
}

function PaidPlanPreview() {
  // 본 UI 는 "유료 플랜 미정 — 출시 시 알림" 만 약속한다.
  // SPEC §05.7.2 D2~D4(가격 모델·무료/유료 기능 비교·가격대) 는 G3 합의 전 단계이므로
  // 구체 항목을 *확정 약속처럼* 노출하지 않는다 (Codex round 7 지적 #1 fix).
  return (
    <Card className="flex flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-5 w-5 text-accent-positive" />
        <h3 className="text-label font-bold text-type-primary">
          유료 플랜 (준비 중)
        </h3>
      </header>
      <p className="text-helper text-type-secondary">
        유료 플랜의 가격·구성·혜택은 아직 확정되지 않았어요. 정식 출시 시점에
        별도로 안내드릴 예정입니다.
      </p>
      <p className="text-helper text-pullim-slate-400">
        세부 가격·기능 비교는 출시 직전 별도 안내합니다.
      </p>
    </Card>
  );
}

type NotifyState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NotifyState>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (state.kind === "submitting") return;

    setState({ kind: "submitting" });
    try {
      // round 10 fix #1 — CSRF 토큰 발급 (SameSite=Strict + HttpOnly 쿠키).
      // submit 직전에 매번 fresh 토큰 발급 — 1회 소비 정책이라 재시도 시 새 토큰 필요.
      // GET 응답이 쿠키를 set 한 직후 POST 가 같은 fetch jar 로 자동 동봉 → 서버 nonce 검증.
      const csrfRes = await fetch("/api/billing/notify/csrf", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!csrfRes.ok) {
        setState({
          kind: "error",
          message: "신청에 실패했어요. 잠시 후 다시 시도해주세요.",
        });
        return;
      }
      // 서버는 외부 메일 서비스(Resend) 에 즉시 위임 후 변수 폐기 — 본 서버 저장 0
      // (SPEC §05.7.5). 클라이언트는 plain email + 출처 메타데이터만 전송.
      // CSRF 쿠키는 same-origin fetch 시 브라우저가 자동 동봉 (SameSite=Strict).
      const res = await fetch("/api/billing/notify", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "billing.notify.signup",
          email: trimmed,
          source: "billing-cta",
          ts: Date.now(),
        }),
      });
      if (!res.ok) {
        // 429 만 사용자 친화적 카피 — 잠시 후 재시도 유도. 503·502·422 등은 일반화.
        const isRateLimited = res.status === 429;
        setState({
          kind: "error",
          message: isRateLimited
            ? "요청이 너무 잦아요. 잠시 후 다시 시도해주세요."
            : "신청에 실패했어요. 잠시 후 다시 시도해주세요.",
        });
        return;
      }
      setState({ kind: "ok" });
    } catch {
      setState({
        kind: "error",
        message: "신청에 실패했어요. 잠시 후 다시 시도해주세요.",
      });
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <header>
        <h3 className="text-label font-bold text-type-primary">
          출시 알림 받기
        </h3>
        <p className="mt-1 text-helper text-type-secondary">
          유료 플랜이 준비되면 이메일로 알려드릴게요.
        </p>
      </header>
      {state.kind === "ok" ? (
        <p
          role="status"
          className="rounded-block border border-accent-positive/30 bg-accent-positive/5 px-3 py-2 text-helper text-type-primary"
        >
          출시 시 알림을 받기 위해 신청됐어요. 입력하신 이메일은 알림 발송용
          외부 서비스(Resend)로 즉시 위임되어 보관되며, 출시 알림 외 용도로는
          사용하지 않습니다. 풀림 서버에는 이메일이 저장되지 않아요.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="billing-notify-email" className="sr-only">
              이메일 주소
            </label>
            <input
              id="billing-notify-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              disabled={state.kind === "submitting"}
              className="flex-1 rounded-block border border-border-hairline bg-bg-block px-3 py-2 text-helper text-type-primary placeholder:text-pullim-slate-400 focus:border-accent-positive focus:outline-none disabled:opacity-60"
            />
            <Button type="submit" disabled={state.kind === "submitting"}>
              {state.kind === "submitting" ? "신청 중…" : "신청"}
            </Button>
          </form>
          {state.kind === "error" && (
            <p
              role="alert"
              className="rounded-block border border-accent-negative/30 bg-accent-negative/5 px-3 py-2 text-helper text-type-primary"
            >
              {state.message}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function PolicyNote() {
  return (
    <div className="flex flex-col gap-1 text-helper text-pullim-slate-400">
      <p>
        결제·구독 정책은 V2 정식 출시 시 이용약관·환불정책과 함께 안내합니다.
      </p>
      <p>
        결제 게이트웨이는 Toss Payments를 사용할 예정이에요. 알림 신청한
        이메일은 풀림 서버에 저장하지 않고, 알림 발송용 외부 서비스(Resend)에
        즉시 위임됩니다.
      </p>
    </div>
  );
}
