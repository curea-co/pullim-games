// 익명 브라우저 fingerprint — SPEC §05 §5.2 Auth/ACL.
// V1: localStorage 기반 UUID. 시크릿 모드/클리어 시 새 fingerprint 발급 (silent data loss 위험은 SPEC §06 critical gap에 명시).
// V2: magic link 옵션으로 재방문 데이터 보존 검토.

const STORAGE_KEY = "pullim-games:fingerprint";

/**
 * 현재 브라우저의 fingerprint를 가져온다. 없으면 새로 생성·저장.
 *
 * 서버사이드(SSR) 환경에서는 null 반환 — 호출자는 클라이언트 mount 후 다시 호출.
 */
export function getFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  if (typeof window.localStorage === "undefined") return null;

  try {
    let fp = window.localStorage.getItem(STORAGE_KEY);
    if (!fp) {
      fp = generateFingerprint();
      window.localStorage.setItem(STORAGE_KEY, fp);
    }
    return fp;
  } catch {
    // localStorage 접근 거부 (시크릿 모드 일부 + 사용자 차단). 휘발성 fingerprint 반환.
    return generateFingerprint();
  }
}

/**
 * fingerprint를 강제로 재발급. 테스트나 명시적 재시작 용도.
 */
export function resetFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  if (typeof window.localStorage === "undefined") return null;
  try {
    const fp = generateFingerprint();
    window.localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    return generateFingerprint();
  }
}

function generateFingerprint(): string {
  // 모던 브라우저 + Node 14.17+ 에서 표준. Next.js 15 대상 환경 모두 지원.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback — 표준 미지원 환경 대응 (실제로는 거의 도달 X).
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
