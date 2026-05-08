"use client";

// 자동 생성 중 spinner / 에러 메시지. shadcn Alert.

import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  state:
    | { kind: "loading" }
    | { kind: "error"; message: string; onRetry: () => void };
}

export function GenerationProgress({ state }: Props) {
  if (state.kind === "loading") {
    return (
      <Alert
        role="status"
        aria-live="polite"
        className="border-border-hairline bg-bg-block text-type-primary"
      >
        <Loader2 className="h-5 w-5 animate-spin text-accent-positive" />
        <AlertTitle className="text-label font-bold text-type-primary">
          카드 만드는 중
        </AlertTitle>
        <AlertDescription className="text-helper text-type-secondary">
          자료를 분석해 카드 형태로 변환하고 있어요. 5~15초 정도 걸려요.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert
      role="alert"
      variant="destructive"
      className="border-accent-negative bg-accent-negative/10 text-type-primary [&>svg]:text-accent-negative"
    >
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-label font-bold text-type-primary">
        자동 생성 실패
      </AlertTitle>
      <AlertDescription className="text-helper text-type-primary">
        {state.message}
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={state.onRetry}
            className="rounded-button border-type-primary bg-bg-block text-helper font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
          >
            다시 시도
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
