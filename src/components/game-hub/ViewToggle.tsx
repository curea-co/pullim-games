"use client";

// 게임 허브 뷰 전환 토글 — shadcn ToggleGroup.

import { Grid3x3, Image as ImageIcon, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// 학습자 5분 모델 — 뷰 옵션은 preview + grid + list 3개만 노출 (design-audit F8).
// 순서: preview 가 가장 왼쪽 = 첫 진입 default. table/thumbnail 컴포넌트는 GameHubPage
// 의 ResultView switch 에 남아 있으나 토글에서는 의도적으로 숨김. URL ?view= 직접
// 접근 fallback 가능, 추후 노출 복원 reversible.
export type GameHubView =
  | "grid"
  | "list"
  | "table"
  | "thumbnail"
  | "preview";

const OPTIONS: Array<{
  value: GameHubView;
  label: string;
  icon: typeof Grid3x3;
}> = [
  { value: "preview", label: "미리보기", icon: ImageIcon },
  { value: "grid", label: "그리드", icon: Grid3x3 },
  { value: "list", label: "리스트", icon: List },
];

interface Props {
  value: GameHubView;
  onChange: (view: GameHubView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as GameHubView)}
      aria-label="뷰 전환"
      className="inline-flex items-center gap-0.5 rounded-button border border-border-hairline bg-bg-block p-0.5"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            aria-label={opt.label}
            title={opt.label}
            className="h-8 w-8 min-w-0 rounded-button text-type-secondary hover:bg-pullim-slate-100 hover:text-type-primary data-[state=on]:bg-accent-positive/10 data-[state=on]:text-accent-positive"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
