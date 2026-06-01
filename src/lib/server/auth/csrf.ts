// auth 라우트 전용 CSRF 헬퍼 인스턴스 (stateless double-submit).
import { createCsrf } from "@/lib/server/http/csrf";

export const AUTH_CSRF_COOKIE = "pullim-csrf-auth";
export const AUTH_CSRF_HEADER = "x-csrf-token";

export const authCsrf = createCsrf({ cookieName: AUTH_CSRF_COOKIE });
