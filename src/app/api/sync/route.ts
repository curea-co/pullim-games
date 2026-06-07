// /api/sync — 계정 사용자 학습 데이터 동기화.
//   GET  = 증분 pull (리소스별 since, 단일 200 + unchanged 마커).
//   POST = push 배치 (LWW, 서버 updated_at stamp).
// 게스트/비로그인은 호출하지 않음(엔진이 계정 세션 없으면 skip). 근거: plan §5 P3.
import { NextResponse } from "next/server";
import {
  getUserFromSessionToken,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { SYNC_CSRF_HEADER, syncCsrf } from "@/lib/server/learning/sync-csrf";
import { syncPushSchema, customSnapshotTooLarge, LIMITS } from "@/lib/server/learning/schemas";
import { pullSrs, pushSrs } from "@/lib/server/learning/srs";
import { pullStreak, pushStreak } from "@/lib/server/learning/streak";
import { pullActivityAggregate, pushActivity } from "@/lib/server/learning/activity";
import { pullCustom, pushCustom, type CustomSnapshot } from "@/lib/server/learning/custom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

async function currentUserId(request: Request): Promise<string | null> {
  const token = readSessionTokenFromCookie(request.headers.get("cookie"));
  if (!token) return null;
  const user = await getUserFromSessionToken(token);
  return user?.id ?? null;
}

function parseSince(url: URL, key: string): number {
  const raw = url.searchParams.get(key);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ── GET: 증분 pull ──────────────────────────────────────────
export async function GET(request: Request) {
  let userId: string | null;
  try {
    userId = await currentUserId(request);
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const url = new URL(request.url);
  const now = Date.now();
  try {
    const [srs, streak, activity, custom] = await Promise.all([
      pullSrs(userId, parseSince(url, "srs_since")),
      pullStreak(userId, parseSince(url, "streak_since")),
      pullActivityAggregate(userId, now),
      pullCustom(userId, parseSince(url, "custom_since")),
    ]);
    return NextResponse.json(
      { srs, streak, activity: { aggregate: activity, cursor: now }, custom, serverTime: now },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    // DB/마이그레이션 장애 → 구조화된 재시도 가능 오류(auth 와 동일 계약). framework 500 회피.
    console.error("[sync] pull backend 미가용", (err as Error).message);
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

// ── POST: push 배치 ─────────────────────────────────────────
export async function POST(request: Request) {
  // CSRF — same-origin(1차) + double-submit 토큰(2차). 외부 학습상태 주입 차단.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: NO_STORE });
  }
  if (
    !syncCsrf.verify(
      syncCsrf.readCookieToken(request.headers.get("cookie")),
      request.headers.get(SYNC_CSRF_HEADER),
    )
  ) {
    return NextResponse.json({ error: "forbidden_csrf" }, { status: 403, headers: NO_STORE });
  }

  let userId: string | null;
  try {
    userId = await currentUserId(request);
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  // body 상한 — 파싱 전 Content-Length 로 거대 배치를 우리 413 으로 차단(인프라 413/500 회피, R6).
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > LIMITS.bodyBytes) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  const parsed = syncPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 422, headers: NO_STORE },
    );
  }
  const data = parsed.data;

  // D6 용량 — 스냅샷 바이트 상한(스키마 후 별도 검사).
  if (data.custom && customSnapshotTooLarge(data.custom)) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413, headers: NO_STORE });
  }

  try {
    await pushSrs(userId, data.srs ?? []); // updated_at 은 서버 시퀀스로 self-stamp
    if (data.streak) await pushStreak(userId, data.streak);
    await pushActivity(userId, data.deviceId, data.activity ?? [], Date.now());
    if (data.custom) await pushCustom(userId, data.custom as unknown as CustomSnapshot);
  } catch (err) {
    // DB/마이그레이션 장애 → 구조화된 재시도 가능 오류로 정규화(framework 500 회피).
    console.error("[sync] push backend 미가용", (err as Error).message);
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }

  // ⚠️ POST 는 pull cursor 를 돌려주지 않는다(#117 R8). stale payload 가 no-op 되면
  // "방금 now" 를 커서로 전진시킬 때 서버의 더 최신 행(updated_at<=now)을 다음 GET 이
  // 영구 건너뛰어 수렴이 깨진다. 클라는 **GET 응답의 리소스별 cursor 로만** 증분 cursor 를
  // 전진시킨다. ok 만 반환(서버가 무엇을 커밋했는지는 다음 GET 이 권위).
  return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
}
