"use client";

// /manage/billing — 결제 (구독 진입점). V1 placeholder + V2 알림 신청 mock.
// plan: proc/plan/2026-05-18_subscription-cta-entry.md §3 Phase 1.

import { useState, type FormEvent } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-type-primary">
          결제
        </h1>
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
        <h2 className="text-label font-bold text-type-primary">현재 플랜</h2>
        <p className="text-helper text-type-secondary">
          <strong className="text-type-primary">무료</strong> · V1 모든 기능을 자유롭게 이용 중이에요.
        </p>
      </div>
    </Card>
  );
}

function PaidPlanPreview() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-5 w-5 text-accent-positive" />
        <h2 className="text-label font-bold text-type-primary">
          유료 플랜 (준비 중)
        </h2>
      </header>
      <p className="text-helper text-type-secondary">
        V2 정식 출시 시 안내드릴 예정이에요. 무료 플랜에 더해 다음 항목이 추가될 예정입니다.
      </p>
      <ul className="flex flex-col gap-1.5 text-helper text-type-secondary">
        <li>· 광고 제거</li>
        <li>· 나만의 게임(custom) 카드 수 무제한</li>
        <li>· 클라우드 동기화 (여러 기기 진행 공유)</li>
      </ul>
      <p className="text-helper text-pullim-slate-400">
        세부 가격·기능 비교는 출시 직전 별도 안내합니다.
      </p>
    </Card>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <header>
        <h2 className="text-label font-bold text-type-primary">
          출시 알림 받기
        </h2>
        <p className="mt-1 text-helper text-type-secondary">
          유료 플랜이 준비되면 이메일로 알려드릴게요.
        </p>
      </header>
      {submitted ? (
        <p
          role="status"
          className="rounded-block border border-accent-positive/30 bg-accent-positive/5 px-3 py-2 text-helper text-type-primary"
        >
          신청이 완료되었어요. 출시 시 알림을 보내드릴게요.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
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
            className="flex-1 rounded-block border border-border-hairline bg-bg-block px-3 py-2 text-helper text-type-primary placeholder:text-pullim-slate-400 focus:border-accent-positive focus:outline-none"
          />
          <Button type="submit">신청</Button>
        </form>
      )}
    </Card>
  );
}

function PolicyNote() {
  return (
    <p className="text-helper text-pullim-slate-400">
      결제·구독 정책은 V2 정식 출시 시 이용약관·환불정책과 함께 안내합니다.
    </p>
  );
}
