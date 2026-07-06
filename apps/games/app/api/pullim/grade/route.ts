// /api/pullim/grade — pullim 모드 회원 학년(grade) 조회·저장.
//   GET  = 현재 grade(홈 진입 시 "학년 미보유" 판정용 모달).
//   POST = grade 저장(회원용 학년 수집 UX).
// grade 는 games-side 콘텐츠 preference(§5.2⒜⑵) — pullim-api 아님, games 자체 projection 보관.
// 신원은 클라 값을 믿지 않고 서버 introspection(`/games/me`)으로 확인. legacy 모드는 404(비활성).
// 🔴 회원 서버 저장은 P-C(중앙 삭제 파기 전파) 확정 전까지 MEMBER_DATA_STORAGE_ENABLED 로 차단.
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { AUTH_CSRF_HEADER, authCsrf } from "@/lib/server/auth/csrf";
import { resolvePullimSub } from "@/lib/server/auth/pullim-introspect";
import {
  getPullimMemberGrade,
  setPullimMemberGrade,
  MEMBER_DATA_STORAGE_ENABLED,
} from "@/lib/server/auth/pullim-member";
import { isGrade } from "@/lib/core/player";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

/** pullim 모드 + 회원 서버 저장 활성화(P-C) 공통 게이트. 미충족 시 응답, 충족 시 null. */
function featureGate(): NextResponse | null {
  if (!PULLIM_MODE) {
    return NextResponse.json({ error: "not_pullim_mode" }, { status: 404, headers: NO_STORE });
  }
  if (!MEMBER_DATA_STORAGE_ENABLED) {
    // P-C(파기 전파) 미확정 → 회원 서버 저장 비활성. 로그인·게이트는 별개로 동작.
    return NextResponse.json({ error: "member_data_disabled" }, { status: 503, headers: NO_STORE });
  }
  return null;
}

export async function GET(request: Request) {
  const gate = featureGate();
  if (gate) return gate;

  const { sub, unavailable } = await resolvePullimSub(request.headers.get("cookie"));
  if (unavailable) {
    // pullim-api 장애 — 로그인 회원을 미인증(401)으로 재분류하지 않는다(§5.2, Codex #146).
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  let grade: string | null;
  try {
    grade = await getPullimMemberGrade(sub);
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ grade }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const gate = featureGate();
  if (gate) return gate;

  // CSRF 방어 — same-origin(1차) + double-submit 토큰(2차, auth 와 동일 games CSRF).
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: NO_STORE });
  }
  if (
    !authCsrf.verify(
      authCsrf.readCookieToken(request.headers.get("cookie")),
      request.headers.get(AUTH_CSRF_HEADER),
    )
  ) {
    return NextResponse.json({ error: "forbidden_csrf" }, { status: 403, headers: NO_STORE });
  }

  let body: { grade?: unknown };
  try {
    body = (await request.json()) as { grade?: unknown };
  } catch {
    body = {};
  }
  const grade = typeof body.grade === "string" ? body.grade : "";
  if (!isGrade(grade)) {
    return NextResponse.json({ error: "invalid_grade" }, { status: 400, headers: NO_STORE });
  }

  // 신원 = 클라 값 불신, 서버 introspection 으로 확인. 장애(503)와 미인증(401) 구분(fail-closed 쓰기).
  const { sub, unavailable } = await resolvePullimSub(request.headers.get("cookie"));
  if (unavailable) {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    await setPullimMemberGrade(sub, grade);
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, grade }, { headers: NO_STORE });
}
