"use client";

// 데이터 내보내기 / 가져오기 — `2026-05-08_management.md` §4.7 / Phase M6.
// JSON 파일 download + file input upload.

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  exportCustomData,
  importCustomData,
  type CustomDataExport,
} from "@/lib/core";

interface Props {
  onAfterImport?: () => void;
}

export function DataPortability({ onAfterImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  function notify(kind: "ok" | "error", text: string) {
    setMessage({ kind, text });
    window.setTimeout(() => setMessage(null), 4000);
  }

  function handleExport() {
    try {
      const data = exportCustomData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `pullim-games-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify("ok", "데이터를 내보냈어요. 다른 디바이스에서 가져오기로 복원할 수 있어요.");
    } catch (e) {
      notify(
        "error",
        e instanceof Error ? e.message : "내보내기 중 오류가 생겼어요.",
      );
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () =>
      notify("error", "파일을 읽는 중 오류가 생겼어요.");
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text) as CustomDataExport;
        importCustomData(data);
        notify(
          "ok",
          `가져왔어요. 과목 ${data.subjects.length}개 · 단원 ${data.curriculum.length}개 · 카드 ${data.cards.length}장 (기존 데이터 보존, 충돌 시 가져온 데이터 우선)`,
        );
        onAfterImport?.();
      } catch (err) {
        notify(
          "error",
          err instanceof Error
            ? err.message
            : "가져오기 형식이 맞지 않아요.",
        );
      }
    };
    reader.readAsText(file);
  }

  return (
    <section
      aria-label="데이터 백업"
      className="flex flex-col gap-3 rounded-block border border-border-hairline bg-bg-block p-4"
    >
      <header>
        <h2 className="text-label font-bold text-type-primary">데이터 백업</h2>
        <p className="mt-1 text-helper text-type-secondary">
          내 콘텐츠를 JSON 파일로 내보내거나 다른 디바이스에서 가져와요.
          서버 동기화는 V2 풀림 SSO 시점에.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-button border border-border-hairline bg-bg-primary px-3 py-2 text-helper font-medium text-type-primary hover:border-type-primary"
        >
          <Download className="h-3.5 w-3.5" />
          내보내기 (JSON)
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex items-center gap-1.5 rounded-button border border-border-hairline bg-bg-primary px-3 py-2 text-helper font-medium text-type-primary hover:border-type-primary"
        >
          <Upload className="h-3.5 w-3.5" />
          가져오기 (JSON)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="JSON 파일 선택"
        />
      </div>
      {message && (
        <p
          role="status"
          className={`text-helper ${
            message.kind === "ok"
              ? "text-accent-positive"
              : "text-accent-negative"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
