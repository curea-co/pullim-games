// 인수분해 게임 도메인 타입.
// SPEC §08.8 Block Tokenization: term 단위 = 1 블록, 공통인수는 term 안의 part 단위로 표시.
// V0.1: hand-author per card. V0.2+: AST 파서로 자동 도출.

/** 항 안의 한 조각. 텍스트 단위 + 공통인수 여부 플래그. */
export interface Part {
  /** 안정적 ID (애니메이션 layoutId 매칭용). */
  id: string;
  /** 화면에 그리는 텍스트. 예: "2", "·", "x". */
  text: string;
  /** 공통인수에 포함되는 part인지 (jade 하이라이트 + 추출 대상). */
  isCommon: boolean;
}

/** 다항식의 한 항. 여러 part 의 시퀀스. */
export interface Term {
  id: string;
  parts: Part[];
}

/** 인수분해 후 표현. factor 가 외부, remainders 는 괄호 내부 항들. */
export interface FactoredForm {
  /** 추출된 공통인수. 예: { id: "factor", text: "2" } */
  factor: { id: string; text: string };
  /** 각 원본 term 에서 공통인수를 빼고 남은 부분. */
  remainders: Term[];
}
