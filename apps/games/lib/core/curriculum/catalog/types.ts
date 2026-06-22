// 교육과정 카탈로그 타입 — NCIC 2022 개정 기반 4-depth 트리.
// spec/06 §6.10 + plan: proc/plan/2026-05-27_curriculum-ai-content-creation.md
//
// 기존 seed/ (vocabulary 풍부, 정적 변환) 와 분리:
//   - seed = 한 단원의 어휘·짝·문제·지문 콘텐츠 (LLM 호출 없이 카드 생성 가능)
//   - catalog = 학교급/과목/학년/단원 메타 + 성취기준 (LLM system prompt 컨텍스트로 사용)

import type { CustomCardKind } from "@/lib/core/custom/types";

export type GradeBand = "elementary" | "middle" | "high";
export type CatalogSubject =
  | "english"
  | "math"
  | "korean"
  | "science"
  | "social";

/** 카탈로그 leaf — 단원 한 칸. */
export interface CatalogUnit {
  unitId: string; // kebab-case. 같은 grade 안에서 unique
  unitName: string; // 사용자 노출 이름
  achievementCodes: string[]; // NCIC 2022 성취기준 코드 (예: "[4영01-01]")
  achievementText: string; // 1~2 문장 성취기준 요지 (LLM 컨텍스트)
  suggestedKinds: CustomCardKind[]; // 메커니즘 추천
  focusVocab?: string[]; // 단원 핵심 어휘 3~5 개 (LLM 시드)
  focusGrammar?: string[]; // 단원 핵심 문법 표현 (선택)
  /** seed JSON 으로 정적 변환 가능한 단원이면 seed 식별자. spec/06 §6.10 "seed 와의 관계". */
  seedRef?: { subjectId: string; unitId: string };
}

/** 학년 — 카탈로그 트리의 3-depth 노드. */
export interface CatalogGrade {
  grade: number; // 4·5·6·1·2·3 — 학교급 안의 학년
  gradeName: string; // 사용자 노출 (예: "초등 4학년")
  units: CatalogUnit[];
}

/** 과목 — 카탈로그 트리의 2-depth 노드. */
export interface CatalogSubjectNode {
  subject: CatalogSubject;
  subjectName: string; // 사용자 노출 (예: "영어")
  grades: CatalogGrade[];
}

/** 학교급 — 카탈로그 트리의 root. */
export interface CatalogGradeBand {
  gradeBand: GradeBand;
  gradeBandName: string; // 사용자 노출 (예: "초등")
  subjects: CatalogSubjectNode[];
}

/** path 한 단원 식별자. */
export interface CatalogPath {
  gradeBand: GradeBand;
  subject: CatalogSubject;
  grade: number;
  unitId: string;
}

/** 한 학년 JSON 파일의 root 스키마. */
export interface CatalogGradeFile {
  gradeBand: GradeBand;
  subject: CatalogSubject;
  grade: number;
  gradeName: string;
  units: CatalogUnit[];
}
