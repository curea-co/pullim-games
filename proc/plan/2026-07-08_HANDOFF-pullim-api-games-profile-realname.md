# 핸드오프 → pullim-games(FE): 프로필 실명 표시 — auth `GET /me` 의 `name` 사용

**작성일**: 2026-07-08
**From**: pullim-api 세션
**To**: pullim-games(FE) 세션
**결정**: 오너 채택(옵션 A) — games 프로필의 실명은 **auth `GET /me` 의 `name` 필드**에서 받는다. **pullim-api 코드 변경 없음.**

> 🎯 **한 줄**: games 프로필이 "psh"(email 앞부분) 대신 **KCB 실명("박승훈")**을 표시하려면, `/games/me` 가 아니라 **auth `GET /me` 의 `name`** 을 쓰면 된다. OS(pullim-web)가 이미 이렇게 실명을 표시한다.

---

## 0. 왜 이 방식인가 (ADR-048 정합)
- 실명(`users.name`, KCB, 암호화 PII) 노출은 **ADR-048** 이 **`GET /me`(owner-only) 단일 표면 + `MeService` 단일 감사 복호 경로**로 못박았다. **별도 self-PII 엔드포인트 신설은 명시적으로 기각**됐다(표면 중복).
- 따라서 `/games/me` 에 실명을 싣지 않는다. games 도 **OS 와 동일하게 `GET /me` 의 `name` 을 소비**한다 — 보안 모델 변경 0, 새 복호 경로 0.
- (참고: pullim-api 가 `/games/me.displayName` 에 실명을 실으려던 접근은 ADR-048 충돌로 **철회**했다.)

## 1. 계약 — `GET /me` (기존, owner-only)
```
GET https://<api-host>/me      (credentials: include — 회원 세션 쿠키)
Guard: JwtVerifyGuard (본인 세션)
```
응답(발췌):
```jsonc
{
  "sub": "user_...",
  "displayName": "psh95king",   // email 유래 별칭(비PII)
  "name": "박승훈",              // ← KCB 실명(복호). 본인-조회 한정. 이걸 프로필에 쓰면 됨
  "profileImage": null,
  "globalRole": "user",
  // email·ageBand·isMinor·package·tier 등도 있음(본인 전용)
}
```
- **`name`** = KCB 실명(복호). **owner-only**(토큰 sub 본인에게만). 복호 실패·미인증 시 서버가 `displayName` 폴백을 넣어 항상 값이 있음(ADR-048 fail-closed).
- **`displayName`** = email 유래 별칭(기존).

## 2. FE 가 할 일 (games 소관)
- **프로필 표시명 소스를 `GET /me.name` 으로**. (지금 `/games/me.displayName`(=email 별칭) 쓰던 걸 프로필 라벨에 한해 `/me.name` 으로 교체.)
- `/games/me` 는 **그대로** 유지(sub·globalRole·gamesFlagLevel — games 전용 introspection). 실명만 `/me` 에서.
- **폴백**: `name` 이 없거나 빈 값이면 `displayName` → "회원" 순으로 폴백(서버도 이미 폴백하지만 FE 방어).
- **PII 취급**: `/me` 는 `email` 등 본인 PII 도 반환한다. 프로필엔 **`name` 만** 쓰고, email 등은 로그·타 표면에 싣지 말 것.

## 3. 선행조건 (CORS)
- games origin 이 auth `/me` 를 `credentials:'include'` 로 호출하므로 pullim-api CORS 에 games origin 이 있어야 한다.
  - **dev**: `dev-api` CORS 에 `https://dev-games.pullim.ai` **이미 추가·검증됨**(ACAO echo 확인). → dev 는 바로 호출 가능.
  - **prod**: `prod-api` CORS 에 `https://games.pullim.ai` 는 **prod SSO 활성화 시** 함께 추가 예정(현재 미적용 — 별 핸드오프 `2026-07-08_...sso-activation-fe.md`).
- CORS 는 오리진 단위 전역이라 `/games/me` 가 통과하면 `/me` 도 통과(같은 오리진).

## 4. 검증
1. games 로그인 후 `GET /me`(쿠키 동봉) → 200, `name` = 박승훈.
2. games 프로필 라벨이 "psh" → **박승훈**.
3. `name` 없는 계정(본인인증 안 한 테스트 등) → `displayName`(email) 폴백.
4. OS 와 games 프로필 이름 **일치**(같은 소스 `/me.name`).

## 5. 범위 밖
- `/games/me` 응답 변경 없음. pullim-api 코드 변경 없음.
- 회원 데이터 저장(P-B/P-C)·SSO 활성화(env)는 별건(각 핸드오프).

## 관련 (pullim-api)
- `GET /me` SoT: `docs/design/services/auth/api.md §2`, `MeResponseDto`(`name` 필드 — ADR-048)
- 결정: `ADR-048-본인-한정-실명-조회-me`, `plan.md §5.13`
