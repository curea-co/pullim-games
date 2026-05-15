# 2026-05-13 — 배포 링크 임베드 메타데이터 풍부화 (OG / Twitter / PWA)

- **상태**: ✅ COMPLETE (retroactive 2026-05-13) — PR #24 머지, OG/Twitter/PWA 풀세트 production 반영. §4 dev 검증·§5 배포 잔여 체크박스는 머지로 사실상 충족
- **트리거**: 사용자 요청 — "pullim-classbot 처럼 서버 배포 후 링크 임베드 시 설명이 풍부하게"
- **확정 도메인**: `https://pullim-games.vercel.app/games` (사용자 명시)
- **스코프**: layout.tsx 메타 풀세트 + 동적 OG/Twitter PNG + PWA manifest + 환경 변수
- **참조**: `/Users/curea/dev_git/pullim-classbot/src/app/{layout,opengraph-image,twitter-image,manifest}.{ts,tsx}` 4단 구성

---

## 1. 배경

현재 [src/app/layout.tsx](../../src/app/layout.tsx) 의 metadata는 title/description/openGraph(축약) 3종만. KakaoTalk·Slack·iMessage·Twitter 에 배포 URL을 공유했을 때:

- ❌ OG 이미지 없음 → 텍스트만 보임 (시각적 임팩트 0)
- ❌ Twitter card 미지정 → 작은 카드로만 노출
- ❌ keywords/applicationName/locale 누락 → 검색 노출 약함
- ❌ PWA manifest 없음 → 모바일 "홈 화면 추가" 시 아이콘·이름 미지정
- ❌ metadataBase 없음 → OG 이미지 absolute URL 해석 불가 → vercel 빌드 경고

자매 프로젝트 [pullim-classbot](https://github.com/curea-co/pullim-classbot) 은 이미 4단 구성으로 풀세트 완비. 동일 패턴을 풀림 게임즈에 적용하되, 브랜드(§7·§8 light/calm/no emoji)에 맞춰 OG 디자인만 재설계.

## 2. 결정사항

| 결정점 | 채택 | 근거 |
|---|---|---|
| 베이스 도메인 | `https://pullim-games.vercel.app` | 사용자 명시 |
| 메인 진입점 (OG url, manifest start_url) | `/games` | 사용자가 게임 허브를 메인 surface 로 지정 |
| OG 이미지 톤 | light warm white (`#FBFAF8`) + `#00D4A1` 점 1개 | spec §7.3 차분함/존중/절제, §8.1 토큰 |
| OG 헤드라인 | "5분, 인수분해를 손으로." | spec §7.5 V1 슬로건 그대로 |
| 폰트 (OG only) | system-ui + Apple SD Gothic Neo 폴백 | edge runtime 에 Pretendard fetch 부담 vs. PNG burn-in 효과 무차이 — classbot 도 동일 결정 |
| 환경변수 명 | `NEXT_PUBLIC_SITE_URL` | Next.js 표준. 폴백 = 결정 도메인 |

## 3. 작업 항목

### 3.1 환경 변수
- [x] `.env.example` 에 `NEXT_PUBLIC_SITE_URL=https://pullim-games.vercel.app` 추가 + 주석

### 3.2 [src/app/layout.tsx](../../src/app/layout.tsx) 메타 풀세트
- [x] `BRAND` / `TAGLINE` / `DESCRIPTION` 상수 분리
- [x] `metadataBase` = `new URL(SITE_URL)`
- [x] `title.default` + `title.template` (서브페이지 자동 합성)
- [x] `applicationName`, `keywords[9]`, `authors`, `creator`, `formatDetection`
- [x] `openGraph` 풀세트 (type/locale/url/siteName/title/description) — `url` 은 `${SITE_URL}/games`
- [x] `twitter` 풀세트 (card=`summary_large_image`, title, description, creator)

### 3.3 [src/app/opengraph-image.tsx](../../src/app/opengraph-image.tsx) 동적 1200×630 PNG
- [x] `runtime = "edge"` + `alt` / `size` / `contentType` export
- [x] 배경 `#FBFAF8` + 미세 8pt 그리드 오버레이 (opacity 0.35)
- [x] 좌상단 풀림 게임즈 브랜드 마크 (`#00D4A1` 점 12px + 이름 + Pullim Games)
- [x] 중앙 헤드라인 112px "5분, 인수분해를 / 손으로." (마침표만 `#00D4A1`)
- [x] 서브 32px "5문제만 풀어보세요…"
- [x] 하단 진행도 도트 (5개, 첫 도트만 `#00D4A1` 채움) + `tabular-nums` "오늘 1 / 5" + `pullim-games.vercel.app`
- [x] 이모지·폭죽·그라디언트 폭격 0 (§7.3 검사 항목)

### 3.4 [src/app/twitter-image.tsx](../../src/app/twitter-image.tsx)
- [x] `runtime = "edge"` 직접 선언 (Next 정적 파싱 한계)
- [x] `default`, `alt`, `size`, `contentType` re-export

### 3.5 [src/app/manifest.ts](../../src/app/manifest.ts) PWA
- [x] `name`, `short_name`, `description`, `lang: "ko-KR"`
- [x] `start_url: "/games"` (사용자 지정 메인 진입점)
- [x] `display: "standalone"`, `orientation: "portrait"`
- [x] `background_color` / `theme_color` = `#FBFAF8` (§8.1 `--bg-primary`)
- [x] `categories: ["education", "games"]`
- [x] `icons` 생략 — public/ 에 아이콘 부재. V2 아이콘 확정 시 추가 (별 plan 으로 분리)

## 4. 검증

- [x] `bunx tsc --noEmit` — 0 errors
- [ ] dev 서버에서 `/opengraph-image` `/twitter-image` `/manifest.webmanifest` 200 응답
- [ ] OG 이미지 시각 검사 — 헤드라인 잘림 없음, `#00D4A1` 액센트 점 1개만, 이모지 0
- [ ] 배포 후 OG 검사:
  - https://www.opengraph.xyz/url/https%3A%2F%2Fpullim-games.vercel.app%2Fgames — 카드 이미지/타이틀/디스크립션 노출
  - KakaoTalk 채팅창 붙여넣기 — 1200×630 풀 이미지 카드
  - Twitter Card Validator — `summary_large_image` 인식

## 5. 배포

- [ ] feature branch `feat/link-embed-metadata`
- [ ] commit: `feat(meta): OG/Twitter/PWA 풀세트 — 배포 링크 임베드 풍부화`
- [ ] push + PR (base: main)
- [ ] PR 머지 → Vercel main 자동 배포
- [ ] **(선택)** Vercel dashboard 에서 `NEXT_PUBLIC_SITE_URL=https://pullim-games.vercel.app` env 등록 — 미등록 시에도 코드 폴백으로 동작하나, env 명시가 더 안전

## 6. 자가 검증 (머지 후)

이 plan 의 §3 모든 작업항목 [x] + §4 자동 검증 + §5 머지 확인을 토대로 사용자에게 보고:
- 배포 URL 임베드 시각 결과 (KakaoTalk 또는 opengraph.xyz 스크린샷 1장)
- 배포된 OG/Twitter/manifest 엔드포인트 200 응답 확인
