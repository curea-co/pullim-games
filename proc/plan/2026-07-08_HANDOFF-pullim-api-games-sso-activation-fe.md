# 핸드오프 → pullim-games(FE): 통합 로그인(SSO) 활성화 — FE 잔여 작업

**작성일**: 2026-07-08
**From**: pullim-api 세션
**To**: pullim-games(FE) 세션
**범위**: **로그인(인증) 컷오버만.** 회원 데이터 저장(P-B 재연결·P-C 파기)은 **보류(dormant)** — 이 핸드오프와 무관(별건: `2026-07-07_...member-relink-P-B.md` 철회 / `2026-07-08_...deletion-purge-P-C.md` 보류).

> 🎯 **한 줄**: games 는 이미 `PULLIM_MODE` SSO 코드가 다 있는데 **Vercel env가 안 켜져 있어서 legacy 모드**(자체 auth)로 돌고 있다. 백엔드(pullim-api) CORS가 열리면, FE 는 **Vercel env 2개 설정 + 재배포 + 검증**만 하면 통합 로그인이 라이브된다.

---

## 0. 왜 지금 이 상태인가 (진단)
- Vercel `pullim-games` 프로젝트에 **env 변수 0개** → `NEXT_PUBLIC_DOMAIN_API_URL`·`NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN` 미설정 → **`PULLIM_MODE=false`(legacy)** → 로그인 시 pullim-web 리다이렉트 안 함(= "리다이렉트 안 된다"의 원인).
- games SSO 코드(PULLIM_MODE 게이트·login-redirect·introspect·session)는 **이미 머지 완료**. 스위치(env)만 안 켜졌다.

## 1. ⚠️ 백엔드 선행조건 상태 (FE 활성화 전 반드시 확인)
| 항목 | 상태 (2026-07-08 기준) |
|---|---|
| pullim-api `/games/me` introspection | ✅ **라이브** — `{ sub, globalRole, gamesFlagLevel, displayName }`. `JwtVerifyGuard` 단독(무료회원 flag=null 도 200, R1 루프 없음). emailMatchHash 없음(회원데이터 보류로 revert됨). |
| **dev-api CORS**(`dev-games.pullim.ai`) | 🟡 **진행 중** — task def `pullim-api-dev:149` 에 오리진 추가·등록 완료, **서비스 배포(update-service) 마지막 1스텝 남음**(수동 게이트). |
| **prod-api CORS**(`games.pullim.ai`) | ❌ **미착수** — prod 켤 때 pullim-api 측에서 별도 추가 필요. |

> **FE 활성화 게이트**: 아래 §3 검증 ①(ACAO echo)이 **초록**일 때만 env 를 켠다. CORS 안 열린 상태로 켜면 `/games/me` 가 브라우저 CORS 차단 → **로그인 무한 루프**. (dev 부터, prod 는 prod CORS 확인 후.)

## 2. FE 가 할 일 — Vercel env 설정 + 재배포

**all-or-nothing**: 두 변수는 **함께** 설정해야 한다(한쪽만이면 `pullim-mode.ts` 가 빌드 fail-fast). `NEXT_PUBLIC_` 라 **빌드타임 인라인 → 재배포 필수**.

| 변수 | dev(Preview) | prod(Production) |
|---|---|---|
| `NEXT_PUBLIC_DOMAIN_API_URL` | `https://dev-api.pullim.ai` | `https://api.pullim.ai` |
| `NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN` | `https://dev.pullim.ai` | `https://pullim.ai` |

- Vercel 프로젝트 `pullim-games`(team `curea`)에 위 값 등록 후 **재배포**(dev 브랜치 preview / production).
- dev 브랜치 preview 는 `NEXT_PUBLIC_PULLIM_LOGIN_ORIGIN` 등을 dev 값으로(브랜치 스코프 권장).

## 3. 검증 (활성화 후 — 필수 4종)
1. **CORS(ACAO)** — 활성화 전 게이트:
   ```
   curl -sI -X OPTIONS 'https://dev-api.pullim.ai/games/me' \
     -H 'Origin: https://dev-games.pullim.ai' -H 'Access-Control-Request-Method: GET' | grep -i access-control-allow-origin
   ```
   → `access-control-allow-origin: https://dev-games.pullim.ai` 나와야 함(없으면 CORS 미개통 — 켜지 말 것).
2. **로그인 리다이렉트** — `dev-games.pullim.ai` 미인증 진입 → pullim-web(`dev.pullim.ai`) 로그인으로 리다이렉트 → 로그인 후 games 복귀.
3. 🔴 **R1 루프 회귀(핵심)** — **games flag 없는(무료) 회원**으로 로그인 시 `/games/me` 가 **403 아닌 200**(무한 루프 없음). games 플레이는 flag 무관 무료라 이게 깨지면 안 됨.
4. **게스트 보존** — 로그인 안 한 게스트가 games 보호 라우트에 여전히 진입(회원 게이트가 게스트를 막지 않음).

## 4. 범위 밖 (건드리지 말 것)
- **회원 데이터 저장**(grade·학습데이터 서버 저장, `PULLIM_MEMBER_DATA_ENABLED`)·**P-B 재연결**·**P-C 파기**는 **보류(dormant)**. #149 재연결 코드는 의도적 파킹(emailMatchHash 부재로 inert) — 이번 로그인 컷오버로 **활성화하지 않는다**. go-live 시 재판단.

## 5. 롤백
- 두 env 제거 + 재배포 → `PULLIM_MODE=false`(legacy 자체 auth)로 즉시 복귀. 서버·DB 영향 없음.

## 관련
- pullim-api 표면 SoT: `docs/design/services/games/api.md §me`
- SSO 코드: `apps/games/lib/auth/pullim-mode.ts`(게이트)·`login-redirect.ts`·`lib/server/auth/pullim-introspect.ts`
- 최초 SSO 핸드오프(CORS·/games/me 계약): `2026-07-03_HANDOFF-pullim-api-games-sso-login.md`
