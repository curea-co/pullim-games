import { describe, expect, it } from "vitest";

import { toPublicUser, type UserRow } from "./users";

// 타겟 정밀화(중1~고1, 2026-06-30) 핵심 계약 — 회원 grade read 시 런타임 정규화.
// 가입 검증(SignupSchema)은 고2·고3 을 막지만 레거시 DB row 는 잔존 가능 →
// toPublicUser 가 범위 밖 grade 를 null 로 정규화해 노출값이 항상 중1~고1 또는 null.
// 근거: proc/plan/2026-06-30_target-middle-to-high1.md.

function row(grade: string | null): UserRow {
  return {
    id: "u1",
    email: "a@b.com",
    password_hash: "x",
    sub: null,
    grade,
    created_at: 0,
    updated_at: 0,
    last_seen_at: null,
  };
}

describe("toPublicUser — grade 정규화(중1~고1)", () => {
  it("타겟 학년(중1~고1)은 그대로 노출", () => {
    for (const g of ["중1", "중2", "중3", "고1"]) {
      expect(toPublicUser(row(g)).grade).toBe(g);
    }
  });

  it("레거시 범위 밖(고2·고3·초등)은 null 로 정규화", () => {
    for (const g of ["고2", "고3", "초5", "초6"]) {
      expect(toPublicUser(row(g)).grade).toBeNull();
    }
  });

  it("미수집(null)·손상값은 null", () => {
    expect(toPublicUser(row(null)).grade).toBeNull();
    expect(toPublicUser(row("garbage")).grade).toBeNull();
  });
});
