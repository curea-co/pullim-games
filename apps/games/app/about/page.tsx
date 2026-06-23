// /about — 소개하기 페이지.
// `2026-05-08_nav-ia-restructure.md` §6 따름.
// 정적 콘텐츠 — 데이터 로딩·인터랙션 0 (외부 링크만).

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Heart,
  Lock,
  Cpu,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { visibleGames } from "@/lib/games/registry";
import type { GameMechanic } from "@/lib/games/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PRINCIPLES = [
  {
    icon: Brain,
    title: "학습 효과 우선",
    body: "재미보다 배움을 먼저. 풀이 동작 자체가 retrieval practice 가 되도록 메커닉을 설계합니다.",
  },
  {
    icon: Heart,
    title: "PVE — 비교 없음",
    body: "친구와 점수를 비교하거나 랭킹에 올라가지 않아요. 어제의 나와만 비교해요.",
  },
  {
    icon: Lock,
    title: "외재 보상 최소화",
    body: "콤보·뱃지·가챠·스트릭 압박 없음. 정답 자체가 보상이 되도록 시각·언어를 절제했어요.",
  },
  {
    icon: Cpu,
    title: "단일 백본 (FSRS)",
    body: "어떤 게임에서 풀어도 같은 카드 풀에 쌓여요. 1주 후, 그 개념을 더 단단하게 다시 만나요.",
  },
  {
    icon: MessageCircle,
    title: "한국어 톤 — 존댓말",
    body: "해요체로 통일. 학생을 존중하는 톤이 학습 동기에도 좋아요.",
  },
  {
    icon: Smartphone,
    title: "모바일 우선",
    body: "5분, 손가락으로. 통학·쉬는 시간에 부담 없이 풀 수 있게 모바일에서 먼저 동작하도록 만들어요.",
  },
];

const MECHANICS: Array<{
  key: GameMechanic;
  label: string;
  wow: string;
}> = [
  {
    key: "manipulation",
    label: "조작 (manipulation)",
    wow: "수식·분자·그래프·벡터를 손으로 변형하면서 도메인 로직을 익혀요.",
  },
  {
    key: "sorting",
    label: "정렬 (sorting)",
    wow: "단어를 어순에, 사건을 시간 축에 — 순서가 학습이에요.",
  },
  {
    key: "matching",
    label: "매칭 (matching)",
    wow: "의미 짝이 맞으면 카드가 결합돼요. 가벼운 retrieval, 강한 spacing.",
  },
  {
    key: "multiple-choice",
    label: "객관식 (multiple-choice)",
    wow: "30초 단답부터 본문 빈칸 추론까지. 같은 결, 다른 깊이.",
  },
  {
    key: "typing",
    label: "타이핑 (typing)",
    wow: "내가 친 글자가 손글씨처럼 떠올라요. 자유 출력형 retrieval.",
  },
];

export default function AboutPage() {
  const officialGames = visibleGames.filter((g) => g.meta.status === "available");

  // 메커닉 결별로 게임 그룹화
  const byMechanic = MECHANICS.map((m) => ({
    ...m,
    games: officialGames.filter((g) => g.meta.mechanic === m.key),
  }));

  return (
    <main className="flex flex-col gap-10 px-4 py-6 md:px-6 md:py-10">
      {/* Hero */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-type-secondary">
          소개하기
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-type-primary md:text-4xl">
          푸는 게 곧 배우는 거예요.
        </h1>
        <p className="text-body text-type-secondary">
          5분, 손가락으로 푸는 학습 게임 {officialGames.length}종.
          <br />
          외재 보상 없이 학습 효과 자체로 끌리는 풀림 게임즈입니다.
        </p>
        <Button
          asChild
          variant="outline"
          className="group mt-2 w-fit gap-2 rounded-button border-type-primary bg-bg-block px-5 py-3 text-body text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
        >
          <Link href="/games">
            게임 허브로
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </section>

      {/* 6 핵심 원칙 */}
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold tracking-tight text-type-primary">
            6 핵심 원칙
          </h2>
          <p className="mt-1 text-helper text-type-secondary">
            모든 메커닉 제안의 1차 필터 — 이 6 원칙을 지키지 않는 메커닉은
            만들지 않아요.
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <Card className="flex items-start gap-3 rounded-block border-border-hairline bg-bg-block p-4 shadow-none">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-accent-positive/10 text-accent-positive"
                >
                  <p.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-type-primary">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-helper text-type-secondary">
                    {p.body}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* 메커닉 결 5종 */}
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold tracking-tight text-type-primary">
            메커닉 결 5종
          </h2>
          <p className="mt-1 text-helper text-type-secondary">
            같은 카드를 다른 결로 만나면 retrieval 깊이가 달라져요.
          </p>
        </header>
        <ul className="flex flex-col gap-3">
          {byMechanic.map((m) => (
            <li key={m.key}>
              <Card className="rounded-block border-border-hairline bg-bg-block p-4 shadow-none">
                <h3 className="text-base font-bold text-type-primary">
                  {m.label}
                </h3>
                <p className="mt-1 text-helper text-type-secondary">{m.wow}</p>
                {m.games.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {m.games.map((g) => {
                      const Icon = g.meta.icon;
                      return (
                        <li key={g.meta.id}>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-button border-border-hairline bg-bg-primary text-helper font-normal text-type-primary hover:border-type-primary hover:bg-bg-primary hover:text-type-primary"
                          >
                            <Link href={`/games/${g.meta.id}`}>
                              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                              {g.meta.title}
                            </Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* 학습 백본 */}
      <Card className="rounded-block border-border-hairline bg-bg-block p-5 shadow-none">
        <h2 className="text-xl font-bold tracking-tight text-type-primary">
          학습 백본
        </h2>
        <p className="mt-2 text-body text-type-secondary">
          어떤 게임을 풀어도 같은 카드 풀에 쌓여요. FSRS 알고리즘이 카드별로
          잊을 시점을 계산해, 가장 효율적인 시점에 다시 만나게 해요.
        </p>
        <p className="mt-2 text-helper text-type-secondary">
          데이터는 모두 사용자 디바이스에만 저장돼요. 회원가입 없이 익명
          fingerprint 로 학습 진도를 이어가요.
        </p>
      </Card>

      {/* 마지막 CTA */}
      <section className="flex flex-col gap-2">
        <Button
          asChild
          variant="outline"
          className="group h-auto justify-between rounded-block border-type-primary bg-bg-block px-5 py-4 text-body text-type-primary hover:bg-accent-positive/10 hover:text-type-primary"
        >
          <Link href="/games">
            <span>지금 시작하기</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
