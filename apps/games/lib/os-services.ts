// 풀림 OS 서비스 카탈로그 — pullim-web src/lib/os-services.ts 정식 이식.
// ServiceSwitcher(앱-홉 드롭다운)의 단일 소스. games 도메인에서 다른 풀림 앱으로 하드 내비게이션.
//
// href 어댑트: games 도메인엔 OS-내부 라우트(/classbot·/q·/writing 등)가 없으므로
// 독립 앱(planner·games·arcade·junior)은 각 *Url(), 그 외 OS-내부 서비스는 osUrl() 로 감싼다.
// (pullim-web 은 OS 셸 위라 상대경로였음 — games 는 절대 URL 필요.)
import { arcadeUrl, gamesUrl, jrUrl, osUrl, plannerUrl } from "@/lib/os/urls";

// ─── Lite shape (used by ServiceSwitcher & nav) ────────────────────────────
export type OsServiceLite = {
  slug: string;
  name: string;
  icon: string;
  href: string;
  desc: string;
  status: "live" | "beta" | "soon";
};

// ─── Full catalog type ──────────────────────────────────────────────────────
export type OsService = {
  slug: string;
  name: string;
  icon: string;
  href: string;
  tagline: string;
  grades: string[];
  subjects: string[];
  studyTypes: string[];
  methodology: string[];
  outcomes: string[];
  savedHoursHint: number;
  pricingTier: "free" | "lite" | "pro" | "b2b";
  status: "live" | "beta" | "soon";
  hidden?: boolean; // true면 OS 전면(나브·스위처)에서 숨김
};

// ─── Full catalog — single source of truth ─────────────────────────────────
export const OS_SERVICES: OsService[] = [
  {
    slug: "planner",
    name: "플래너",
    icon: "/os/icons/03_planner.svg",
    href: `${plannerUrl()}/planner`,
    tagline: "내 공부, 내가 설계한다.",
    grades: ["중1", "중2", "중3", "고1", "고2", "고3"],
    subjects: ["공통"],
    studyTypes: ["자기주도", "내신", "수능"],
    methodology: ["진단"],
    outcomes: [
      "8단계 빌더 + 7대 학습 엔진으로 15분 완성.",
      "학생 승인 기반 공동 편집 + 주간 리포트.",
      "플래너 블록 → 학생 캘린더 자동 동기화.",
    ],
    savedHoursHint: 240,
    pricingTier: "lite",
    status: "live",
  },
  {
    slug: "classbot",
    name: "클래스봇",
    icon: "/os/icons/04_classbot.svg",
    href: `${osUrl()}/classbot`,
    tagline: "선생님의 분신을 만든다.",
    grades: ["중1", "중2", "중3", "고1", "고2", "고3"],
    subjects: ["국어", "영어", "사회", "과학", "수학"],
    studyTypes: ["내신", "수행평가"],
    methodology: ["진단"],
    outcomes: [
      "봇 빌더로 수업 한 번 설계, 모든 반에 배포.",
      "Scope Guard L4 시간대에 봇이 안전 응답.",
      "주간/단원 리포트 + 번아웃 경보.",
    ],
    savedHoursHint: 320,
    pricingTier: "b2b",
    status: "live",
  },
  {
    slug: "q",
    name: "문제큐",
    icon: "/os/icons/05_q.svg",
    href: `${osUrl()}/q`,
    tagline: "풀고, 틀리고, 다시 자라난다.",
    grades: ["중3", "고1", "고2", "고3"],
    subjects: ["국어", "영어", "사회", "과학", "수학"],
    studyTypes: ["내신", "수능", "복습"],
    methodology: ["반복학습", "진단"],
    outcomes: [
      "숙련 엔진이 실력에 맞춰 다음 문제를 출제.",
      "틀리면 유사 문제로, 맞히면 한 단계 위로 — 적응형 분기.",
      "씨앗→열매 숙련을 증거로 증명, 학원·학교·입시 리포트로 재사용.",
    ],
    savedHoursHint: 480,
    pricingTier: "lite",
    status: "live",
  },
  {
    slug: "games",
    name: "게임즈",
    icon: "/os/icons/06_games.svg",
    href: `${gamesUrl()}/games`,
    tagline: "숙제 끝나고 30분 더 한다.",
    grades: ["중1", "중2", "중3", "고1"],
    subjects: ["국어", "영어", "사회", "과학", "수학"],
    studyTypes: ["자기주도", "복습"],
    methodology: ["게이미피케이션"],
    outcomes: [
      "게스트 플레이 + 결과 공유로 한 단계 더.",
      "풀림 게임즈는 광고·코스메틱 결제 없음.",
      "콘텐츠 빌더로 5분 안에 카드 한 세트.",
    ],
    savedHoursHint: 80,
    pricingTier: "free",
    status: "live",
  },
  {
    slug: "writing",
    name: "라이팅 코치",
    icon: "/os/icons/08_writing.svg",
    href: `${osUrl()}/writing`,
    tagline: "한 줄, 한 단락이 더 좋아진다.",
    grades: ["중2", "중3", "고1", "고2", "고3"],
    subjects: ["국어", "영어"],
    studyTypes: ["수행평가", "서술형", "자기주도"],
    methodology: ["첨삭"],
    outcomes: [
      "5영역 루브릭(내용·구조·표현·문장·맞춤법) 자동 첨삭.",
      "수행평가 논술·자소서·독서록 주제별 템플릿.",
      "브레인스토밍 → 초안 → 퇴고 단계 코칭.",
      "교사 검수 모드로 학생 글에 교사가 보충.",
    ],
    savedHoursHint: 180,
    pricingTier: "lite",
    status: "live",
  },
  {
    slug: "exam",
    name: "입시 코치",
    icon: "/os/icons/07_exam.svg",
    href: `${osUrl()}/exam`,
    tagline: "입시 준비를 데이터로 한다.",
    grades: ["고1", "고2", "고3"],
    subjects: ["공통"],
    studyTypes: ["수능", "내신", "자기주도"],
    methodology: ["진단"],
    outcomes: [
      "내신·모의·θ·활동 통합 뷰로 입시 전략 설계.",
      "입시 캘린더 — 모집 일정·전형별 마감 자동 정리.",
      "생기부 활동·면접 준비 AI 진단.",
    ],
    savedHoursHint: 600,
    pricingTier: "pro",
    status: "live",
  },
  {
    slug: "store",
    name: "스토어",
    icon: "/os/icons/02_store.svg",
    href: `${osUrl()}/store`,
    tagline: "검증된 콘텐츠만 사고 판다.",
    grades: ["중1", "중2", "중3", "고1", "고2", "고3"],
    subjects: ["국어", "영어", "사회", "과학", "수학", "공통"],
    studyTypes: ["수행평가", "내신", "수능", "자기주도"],
    methodology: ["유통"],
    outcomes: [
      "브랜드 스토어 + 워터마크/DRM + 분기 정산.",
      "풀림 인증 마크 + 누적 판매·리뷰 신뢰 지표.",
      "학원 브랜드 스토어 · 자료 큐레이션 권한.",
    ],
    savedHoursHint: 120,
    pricingTier: "lite",
    status: "live",
  },
  {
    slug: "reader",
    name: "리더",
    icon: "/os/icons/10_reader.svg",
    href: `${osUrl()}/reader`,
    tagline: "내 자료 가져와 필기하는 학습 노트앱.",
    grades: ["중1", "중2", "중3", "고1", "고2", "고3"],
    subjects: ["공통"],
    studyTypes: ["자기주도", "복습", "내신", "수능"],
    methodology: ["독해", "반복학습"],
    outcomes: [
      "내 PDF·교재·필기 자료를 가져와 펜·형광펜으로 필기 — 굿노트·플렉슬 대체.",
      "문제·풀이·해설 영역과 오답이 학습 데이터로 남아 복습 큐로 자동 전환.",
      "AI 사이드바가 페이지 요약·단계별 힌트·약점 진단을 제공.",
      "필기 엔진(Ink)은 문제큐·플래너에도 임베드.",
    ],
    savedHoursHint: 160,
    pricingTier: "lite",
    status: "beta",
    hidden: true, // 리더 미출시 — 전면 비노출
  },
  {
    slug: "studio",
    name: "스튜디오",
    icon: "/os/icons/01_studio.svg",
    href: `${osUrl()}/studio`,
    tagline: "제작은 AI가, 검증은 사람이.",
    grades: ["중1", "중2", "중3", "고1", "고2", "고3"],
    subjects: ["국어", "영어", "사회", "과학", "수학", "공통"],
    studyTypes: ["수행평가", "내신", "수능"],
    methodology: ["콘텐츠제작"],
    outcomes: [
      "주 1회 시험지 제작 시간이 4시간 → 50분으로.",
      "교과 RAG로 환각 없이 즉시 초안 생성.",
      "풀림 인증 통과 문항만 출판 라인업에 배치.",
    ],
    savedHoursHint: 520,
    pricingTier: "pro",
    status: "live",
  },
  {
    slug: "junior",
    name: "주니어",
    icon: "/os/icons/pullim.svg", // 전용 아이콘 미정 — placeholder
    href: jrUrl(), // 초등 전용 독립 앱
    tagline: "초등, 즐겁게 시작하는 첫 학습.",
    grades: ["초1", "초2", "초3", "초4", "초5", "초6"],
    subjects: ["국어", "영어", "수학"],
    studyTypes: ["자기주도", "복습"],
    methodology: ["게이미피케이션", "진단"],
    outcomes: [
      "초등 눈높이 학습 — 점수보다 습관과 기초.",
      "게임처럼 즐기며 매일 학습하는 루틴.",
      "보호자 리포트로 성장을 함께 확인.",
    ],
    savedHoursHint: 60,
    pricingTier: "free",
    status: "live",
  },
  {
    slug: "arcade",
    name: "아케이드",
    icon: "/os/icons/06_games.svg", // 게임즈와 아이콘 공유(전용 아이콘 미정)
    href: arcadeUrl(),
    tagline: "무료로 즐기는 학습 아케이드.",
    grades: ["중1", "중2", "중3", "고1"],
    subjects: ["국어", "영어", "사회", "과학", "수학"],
    studyTypes: ["자기주도", "복습"],
    methodology: ["게이미피케이션"],
    outcomes: [
      "누구나 무료로 즐기는 학습 게임 모음.",
      "가볍게 개념을 복습하는 게이미피케이션.",
      "게임즈와 함께 학습 습관을 붙인다.",
    ],
    savedHoursHint: 60,
    pricingTier: "free",
    status: "live",
  },
];

// ─── Derived nav list (one source of truth) ────────────────────────────────
export const OS_SERVICES_NAV: OsServiceLite[] = OS_SERVICES.filter((s) => !s.hidden).map((s) => ({
  slug: s.slug,
  name: s.name,
  icon: s.icon,
  href: s.href,
  desc: s.tagline,
  status: s.status,
}));
