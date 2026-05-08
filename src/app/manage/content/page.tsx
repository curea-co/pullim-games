// /manage/content — 콘텐츠 입력 (placeholder, M4 가 본격 구현).

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ContentPage() {
  return (
    <div className="rounded-block border border-dashed border-border-hairline bg-bg-block p-8 text-center">
      <h2 className="text-base font-bold text-type-primary">콘텐츠 입력 준비 중</h2>
      <p className="mt-2 text-helper text-type-secondary">
        4지선다·빈칸·타이핑·매칭 카드를 텍스트로 입력하는 워크플로우를 만들고 있어요.
        <br />
        먼저 과목과 단원을 만들어 두세요.
      </p>
      <Link
        href="/manage/subjects"
        className="mt-4 inline-flex items-center gap-1.5 rounded-button border border-type-primary bg-bg-block px-3 py-2 text-helper font-medium text-type-primary hover:bg-accent-positive/10"
      >
        과목 만들기
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
