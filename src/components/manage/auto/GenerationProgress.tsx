"use client";

// 자동 생성 중 spinner / 에러 메시지.

import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  state:
    | { kind: "loading" }
    | { kind: "error"; message: string; onRetry: () => void };
}

export function GenerationProgress({ state }: Props) {
  if (state.kind === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-block border border-border-hairline bg-bg-block p-4"
      >
        <Loader2 className="h-5 w-5 animate-spin text-accent-positive" />
        <div className="flex-1">
          <p className="text-label font-bold text-type-primary">
            카드 만드는 중
          </p>
          <p className="text-helper text-type-secondary">
            자료를 분석해 카드 형태로 변환하고 있어요. 5~15초 정도 걸려요.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-block border border-accent-negative bg-accent-negative/10 p-4"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 text-accent-negative" />
      <div className="flex-1">
        <p className="text-label font-bold text-type-primary">
          자동 생성 실패
        </p>
        <p className="mt-1 text-helper text-type-primary">{state.message}</p>
        <button
          type="button"
          onClick={state.onRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-1.5 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
