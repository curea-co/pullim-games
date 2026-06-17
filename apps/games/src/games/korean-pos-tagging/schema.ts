// 품사 태깅 카드 스키마 — 문장을 토큰 단위로 분리, 각 토큰의 품사가 정답.
// V0: 7 품사 (명사·대명사·동사·형용사·관형사·부사·조사). 수사·감탄사는 V1+ 확장.
// 토큰 = 형태소 단위 (콘텐츠 작성자가 직접 분리). "고양이가" → "고양이"(명) + "가"(조).

import { z } from "zod";
import { CardBaseSchema } from "@/lib/core";

export const POS_VALUES = [
  "명사",
  "대명사",
  "동사",
  "형용사",
  "관형사",
  "부사",
  "조사",
] as const;

export const PosSchema = z.enum(POS_VALUES);
export type KoreanPos = z.infer<typeof PosSchema>;

const TokenSchema = z.object({
  id: z.string().min(1),
  /** 토큰 표시 텍스트 (예: "고양이", "가", "본다"). */
  text: z.string().min(1),
  /** 정답 품사. */
  pos: PosSchema,
});

export const KoreanPosTaggingProblemSchema = z.object({
  /** 표시용 원본 문장 (디버그·접근성). 토큰을 띄어쓰기로 연결한 형태와 동일하지 않을 수 있음. */
  sentence: z.string().min(1),
  /** 토큰 시퀀스 — 학생이 순서대로 품사 태그함. */
  tokens: z.array(TokenSchema).min(2),
});

export const KoreanPosTaggingCardSchema = CardBaseSchema.extend({
  type: z.literal("korean-pos-tagging"),
  problem: KoreanPosTaggingProblemSchema,
});

export type KoreanPosTaggingCard = z.infer<typeof KoreanPosTaggingCardSchema>;
export type Token = z.infer<typeof TokenSchema>;
