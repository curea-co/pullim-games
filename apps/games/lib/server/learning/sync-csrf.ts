// 학습 동기화 전용 CSRF 헬퍼(stateless double-submit). auth 와 동형, 쿠키만 분리.
// 근거: proc/plan/2026-06-05_learning-data-server-sync.md §5 P3 (R3 — double-submit 고정).
import { createCsrf } from "@/lib/server/http/csrf";

export const SYNC_CSRF_COOKIE = "pullim-csrf-sync";
export const SYNC_CSRF_HEADER = "x-csrf-token";

export const syncCsrf = createCsrf({ cookieName: SYNC_CSRF_COOKIE });
