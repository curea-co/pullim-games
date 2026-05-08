# 어휘 타이핑 (vocab-typing)

- **gameId**: `vocab-typing`
- **과목 · 단원**: 국어 / 한자/어휘
- **메커닉**: typing (타이핑, 출력형)
- **retrieval 깊이**: medium (중간, 출력형)
- **세션 길이**: 약 2분
- **상태**: `available`

## 시작하기

1. **이 디렉토리만 작업하세요.** `src/lib/core/` 변경이 필요하면 별도 PR.
2. `npm run dev` → `http://localhost:3000/games/vocab-typing` 에서 확인.
3. 테스트: `npm test -- src/games/vocab-typing/`

## 핵심 명제

뜻풀이가 화면 상단에 떠 있고, 학생이 키보드로 정답 어휘를 한글 음으로 입력한다. 입력한 글자가 letter-fade-in 으로 나타남. **출력 (recall)** 형 retrieval — 인식 단계를 넘어선 깊이.

> **wow 모먼트**: "내가 친 글자가 부드럽게 떠올라 — 정답을 내가 적었다는 감각"

## 구현 현황

- [x] 모바일 IME 호환 텍스트 입력 (autoComplete/autoCapitalize/autoCorrect off)
- [x] AnimatePresence + popLayout letter-fade-in (한 글자씩)
- [x] 5장 카드: 모순/묵묵부답/일거양득/절치부심/천편일률
- [x] 정답 시 한자 표기 (pronunciation) 부드럽게 노출
- [x] FSRS 통합 — strict 일치 정답 판정 (한글 음만, V3+ 한자 직접 입력 검토)
- [x] 힌트 버튼 — 첫 글자 공개 시 FSRS rating 'good' → 'hard' 패널티

## 콘텐츠 후보 (V2 작업 시 5장 우선)

1. **수능 빈출 한자어 (난이도 1)**: 모순(矛盾) — 앞뒤가 안 맞는 일
2. **고전 어휘 (난이도 2)**: 묵묵부답(默默不答) — 잠자코 아무 대답도 하지 않음
3. **한자성어 (난이도 3)**: 일거양득(一擧兩得) — 한 가지 일로 두 가지 이익
4. **한자성어 (난이도 4)**: 절치부심(切齒腐心) — 이를 갈고 마음을 썩임
5. **고난도 한자어 (난이도 5)**: 천편일률(千篇一律) — 여러 시문이 모두 비슷비슷함

## 주의

- 모바일 키보드 입력 친화 — 데스크톱 의존 X. iOS 한글 IME 자동 완성 충돌 방지 (autocomplete=off)
- 오답 시 shake (32px) + 정답 표시 → FSRS Again
- 외재 보상 (타이핑 속도, WPM) 자제. "맞췄다"가 보상
- 한자 직접 입력은 V3+ — V2 시작은 한글 음 입력으로 시작 (학습 부담 단계)
