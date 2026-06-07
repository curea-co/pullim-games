// GET /api/sync/cleanup — activity_log 14일 retention 권위 enforcer(서버측 주기 cleanup).
// Vercel Cron 일일 호출(vercel.json). 근거: proc/plan §5 P6 / spec/05 §5.5 (R5).
// 인증: CRON_SECRET 설정 시 Vercel 이 `Authorization: Bearer <CRON_SECRET>` 자동 동봉.
import { NextResponse } from "next/server";
import { purgeStaleActivity } from "@/lib/server/learning/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // 시크릿 설정 시 일치 강제. 미설정(로컬 등)이면 same-origin 만으로도 도는 게 아니라,
  // 외부 호출 방지를 위해 시크릿 없으면 prod 에서 거부(설정 누락 가드).
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "cron_secret_unset" }, { status: 503 });
  }

  try {
    const removed = await purgeStaleActivity(Date.now());
    return NextResponse.json(
      { ok: true, removed },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    // DB/마이그레이션 장애 → 구조화된 503(framework 500 으로 조용히 멈추지 않게). 다음 cron 에 재시도.
    console.error("[sync/cleanup] backend 미가용", (err as Error).message);
    return NextResponse.json(
      { error: "backend_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
