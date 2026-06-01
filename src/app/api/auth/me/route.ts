// GET /api/auth/me — 현재 로그인 사용자 (없으면 user: null).
import { NextResponse } from "next/server";
import {
  getUserFromSessionToken,
  readSessionTokenFromCookie,
} from "@/lib/server/auth/session";
import { toPublicUser } from "@/lib/server/auth/users";

// 사용자 식별 JSON(이메일 등)이 중간 캐시·다른 경로로 재사용되지 않게 비공개·비캐시 고정.
const NO_STORE = { "cache-control": "private, no-store" } as const;

export async function GET(request: Request) {
  const token = readSessionTokenFromCookie(request.headers.get("cookie"));

  // 토큰(세션 쿠키) 없음 = 확실한 무신원 → 200 { user:null }. DB 미접근이라 503 이 날 수 없다.
  // 이로써 503(아래)은 **항상 "세션 쿠키 보유 + 백엔드 장애"** = 회원 가능성만 의미하게 되고,
  // 클라 fail-open(미확정 시 게이트 통과)이 "완전 무신원"까지 열어주는 회귀를 차단한다(Codex #114 R3).
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200, headers: NO_STORE });
  }

  try {
    const user = await getUserFromSessionToken(token);
    return NextResponse.json(
      { user: user ? toPublicUser(user) : null },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    console.error("[auth/me] backend 미가용", (err as Error).message);
    // "세션 쿠키는 있는데 백엔드(DB) 장애로 검증 불가" = 미확정 → 503. 익명 브라우징(토큰 없음)은
    // 위에서 200 으로 처리되므로 영향 없음. 회원이 DB 일시 장애로 게이트에서 튕기지 않게 한다.
    return NextResponse.json(
      { user: null, unavailable: true },
      { status: 503, headers: NO_STORE },
    );
  }
}
