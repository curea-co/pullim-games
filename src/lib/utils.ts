// classnames 머지 헬퍼 — Tailwind 충돌 해소 (마지막 클래스 우선).
// shell 컴포넌트들이 의존하는 표준 cn().

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
