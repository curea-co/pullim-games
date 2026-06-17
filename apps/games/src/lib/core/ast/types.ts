// 다항식 도메인 타입 — 단변수(x) 정수 계수·지수 한정 (V0.2 범위).
// V0.3+: 다변수, 분수 계수, 부동소수, 더 복잡한 표현식 확장.

/** 다항식의 한 항. ax^n 형태. */
export interface PolynomialTerm {
  /** 계수 (부호 포함). 0 일 수 있음. */
  coefficient: number;
  /** 변수 이름 — 'x' 등 단일 알파벳. 상수항이면 빈 문자열. */
  variable: string;
  /** 지수. 상수항(variable === '') 이면 항상 0. 양의 정수 지수 가정. */
  exponent: number;
}

/** 항의 시퀀스. 정규화: 같은 (variable, exponent) 끼리는 합쳐져 있음을 가정. */
export type Polynomial = PolynomialTerm[];
