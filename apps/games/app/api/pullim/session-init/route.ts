// /api/pullim/session-init — pullim 모드 회원 로그인 직후 **확정 재연결 트리거**(P-B).
//   POST = projection 물질화 + legacy 재연결(materializePullimMember) 후 현재 grade 반환.
// 재연결을 grade 모달(POST /grade)에 의존하지 않게 하는 전용 진입점 — legacy 회원이 첫 로그인
//   직후 옛 데이터·grade 를 복원받고, 모달 오탐(옛 grade 있는데 재노출)·dismiss 지연을 막는다(Codex #149).
// 🔴 #146 GET=읽기전용 계약 유지 — 물질화(write)는 **same-origin+CSRF POST** 로만(외부 GET 창구 아님).
//   회원 서버 저장은 P-C 확정 전까지 MEMBER_DATA_STORAGE_ENABLED 로 차단.
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/server/http/same-origin";
import { AUTH_CSRF_HEADER, authCsrf } from "@/lib/server/auth/csrf";
import { resolvePullimSub } from "@/lib/server/auth/pullim-introspect";
import { materializePullimMember, MEMBER_DATA_STORAGE_ENABLED } from "@/lib/server/auth/pullim-member";
import { PULLIM_MODE } from "@/lib/auth/pullim-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" } as const;

export async function POST(request: Request) {
  // pullim 모드 + 회원 서버 저장 활성화 공통 게이트(grade 라우트와 동일 계약).
  if (!PULLIM_MODE) {
    return NextResponse.json({ error: "not_pullim_mode" }, { status: 404, headers: NO_STORE });
  }
  if (!MEMBER_DATA_STORAGE_ENABLED) {
    return NextResponse.json({ error: "member_data_disabled" }, { status: 503, headers: NO_STORE });
  }

  // CSRF 방어 — same-origin(1차) + double-submit 토큰(2차). GET-write 회피(#146)의 핵심 가드.
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

  // 신원 = 클라 값 불신, 서버 introspection. 장애(503)/미인증(401) 구분. emailMatchHash 로 재연결.
  const { sub, unavailable, emailMatchHash } = await resolvePullimSub(request.headers.get("cookie"));
  if (unavailable) {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (!sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    // 물질화 + P-B 재연결(미종결 회원만). 재연결이 legacy grade 를 승계했으면 그 값이 반환된다 →
    //   클라 grade 모달이 오탐하지 않는다.
    const member = await materializePullimMember(sub, emailMatchHash);
    return NextResponse.json({ ok: true, grade: member.grade }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
