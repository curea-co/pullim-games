import { PullimMark } from "@/components/brand/PullimMark";

export function PlayerLoadingState({
  label = "게임을 불러오고 있어요",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-puds-state="loading"
      className="grid min-h-[60vh] place-items-center px-6 text-center"
    >
      <div className="flex flex-col items-center gap-4">
        <PullimMark className="puds-loading-mark h-12 w-12" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
