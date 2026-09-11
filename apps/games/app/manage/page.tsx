"use client";

// /manage — 관리 홈 (대시보드).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Folder, Layers } from "lucide-react";
import { loadCounts, type CustomCounts } from "@/lib/core";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataPortability } from "@/components/manage/DataPortability";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ManageHomePage() {
  const [counts, setCounts] = useState<CustomCounts | null>(null);

  function refresh() {
    setCounts(loadCounts());
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!counts) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-block border border-border-hairline bg-bg-block"
          />
        ))}
      </div>
    );
  }

  const isEmpty = counts.subjects === 0 && counts.cards === 0;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="관리 통계" className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Folder}
          label="과목"
          value={counts.subjects}
          helper="내가 만든"
        />
        <StatCard icon={Layers} label="단원" value={counts.curriculum} />
        <StatCard
          icon={BookOpen}
          label="카드"
          value={counts.cards}
          helper={
            counts.cards > 0
              ? `객관식 ${counts.cardsByKind["multiple-choice"]} · 빈칸 ${counts.cardsByKind.blank} · 타이핑 ${counts.cardsByKind.typing} · 매칭 ${counts.cardsByKind["word-match"]}`
              : "아직 없어요"
          }
        />
      </section>

      <section
        aria-label="빠른 진입"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        <Button
          asChild
          variant="outline"
          className="group h-auto justify-between rounded-block border-type-primary bg-bg-block px-5 py-4 text-body text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
        >
          <Link href="/manage/content">
            <span>+ 카드 추가</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="group h-auto justify-between rounded-block border-border-hairline bg-bg-block px-5 py-4 text-body text-type-primary hover:border-type-primary hover:bg-bg-block hover:text-type-primary"
        >
          <Link href="/manage/custom-games" data-cta-priority="informational">
            <span>내 게임 보기</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </section>

      <DataPortability onAfterImport={refresh} />

      {isEmpty && (
        <Card
          aria-label="시작 가이드"
          className="rounded-block border-border-hairline bg-bg-block p-5 shadow-none"
        >
          <h2 className="text-base font-bold text-type-primary">
            첫 카드까지 4단계
          </h2>
          <ol className="mt-3 flex flex-col gap-2 text-helper text-type-secondary">
            <li>
              <span className="font-bold text-type-primary">1. 과목</span>{" "}
              만들기 (예: 수능 영어, 내 한국사)
            </li>
            <li>
              <span className="font-bold text-type-primary">2. 단원</span>{" "}
              만들기 (예: 1단원, 1차시)
            </li>
            <li>
              <span className="font-bold text-type-primary">3. 카드</span>{" "}
              입력 (객관식·빈칸·타이핑·매칭 중 골라서)
            </li>
            <li>
              <span className="font-bold text-type-primary">4. 게임 풀기</span>{" "}
              — 게임 허브의 "나만의 게임" 또는 관리 → 내 게임에서
            </li>
          </ol>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5 rounded-button border-type-primary bg-bg-block text-helper font-medium text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
          >
            <Link href="/manage/subjects" data-cta-priority="informational">
              과목 만들기
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
