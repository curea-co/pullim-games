// pullim 회원 projection upsert + grade get/set 테스트 (mock exec — DB 불요).
import { describe, it, expect, vi } from "vitest";
import {
  ensurePullimMember,
  getPullimMemberGrade,
  setPullimMemberGrade,
} from "./pullim-member";

type Row = Record<string, unknown>;
function mockExec(rows: Row[]) {
  return vi.fn(async (_text: string, _params?: unknown[]) => ({ rows, rowCount: rows.length }));
}

describe("ensurePullimMember — sub projection lazy upsert", () => {
  it("INSERT ... ON CONFLICT(sub) 로 upsert, id·sub·정규화 grade·created 반환", async () => {
    const exec = mockExec([{ id: "u_local", sub: "sub_1", grade: "중2", created: true }]);
    const r = await ensurePullimMember("sub_1", exec as never);
    expect(r).toEqual({ id: "u_local", sub: "sub_1", grade: "중2", created: true });
    const sql = (exec.mock.calls[0][0] as string);
    expect(sql).toMatch(/INSERT INTO users/);
    expect(sql).toMatch(/ON CONFLICT \(sub\) WHERE sub IS NOT NULL/);
    expect(sql).toMatch(/xmax::text::bigint = 0\) AS created/); // 최초 생성 판정
  });

  it("created=false(재진입 upsert) 반영", async () => {
    const r = await ensurePullimMember("s", mockExec([{ id: "i", sub: "s", grade: "중1", created: false }]) as never);
    expect(r.created).toBe(false);
  });

  it("타겟 밖 grade(고3)·null 은 null 로 정규화", async () => {
    expect((await ensurePullimMember("s", mockExec([{ id: "i", sub: "s", grade: "고3", created: true }]) as never)).grade).toBeNull();
    expect((await ensurePullimMember("s", mockExec([{ id: "i", sub: "s", grade: null, created: true }]) as never)).grade).toBeNull();
  });
});

describe("getPullimMemberGrade", () => {
  it("row 있으면 정규화 grade, 없으면 null", async () => {
    expect(await getPullimMemberGrade("s", mockExec([{ grade: "고1" }]) as never)).toBe("고1");
    expect(await getPullimMemberGrade("s", mockExec([]) as never)).toBeNull();
    expect(await getPullimMemberGrade("s", mockExec([{ grade: "고3" }]) as never)).toBeNull(); // 밖 → null
  });
});

describe("setPullimMemberGrade", () => {
  it("유효 grade 면 ensure(upsert) 후 UPDATE", async () => {
    const exec = mockExec([{ id: "i", sub: "s", grade: null }]);
    await setPullimMemberGrade("s", "중1", exec as never);
    // ensurePullimMember(INSERT) + UPDATE = 2회 호출
    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec.mock.calls[1][0]).toMatch(/UPDATE users SET grade/);
  });

  it("🔴 타겟 밖 grade(고3)·빈값 은 throw(저장 안 함)", async () => {
    const exec = mockExec([]);
    await expect(setPullimMemberGrade("s", "고3", exec as never)).rejects.toThrow(/invalid grade/);
    await expect(setPullimMemberGrade("s", "", exec as never)).rejects.toThrow(/invalid grade/);
    expect(exec).not.toHaveBeenCalled();
  });
});
