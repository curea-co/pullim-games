// P-B 회원 재연결 단위 테스트 (mock QueryFn — DB 불요).
// SQL 문자열로 라우팅하는 스마트 mock 으로 이관·파기·보류 경로를 검증한다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backfillLegacyEmailMatchHashes, relinkLegacyMember } from "./pullim-relink";
import { computeEmailMatchHash } from "./email-match-hash";

const PEPPER = "test-pepper";

type Row = Record<string, unknown>;
/** SQL 조각 → 반환 rows 매핑으로 QueryFn mock 을 만든다. 기록된 calls 로 부작용 검증. */
function routedExec(routes: { match: RegExp; rows: Row[] }[]) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const fn = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    const hit = routes.find((r) => r.match.test(sql));
    return { rows: hit ? hit.rows : [], rowCount: hit ? hit.rows.length : 0 };
  });
  return { fn, calls };
}

beforeEach(() => {
  process.env.GAMES_EMAIL_MATCH_PEPPER = PEPPER;
});
afterEach(() => {
  delete process.env.GAMES_EMAIL_MATCH_PEPPER;
  vi.restoreAllMocks();
});

describe("relinkLegacyMember — 안전 규칙(§5.2)", () => {
  it("pepper 미주입 → dormant(쿼리 0)", async () => {
    delete process.env.GAMES_EMAIL_MATCH_PEPPER;
    const { fn } = routedExec([]);
    expect(await relinkLegacyMember({ id: "m", grade: null }, "hash", fn as never)).toEqual({
      status: "dormant",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("emailMatchHash null → dormant(쿼리 0)", async () => {
    const { fn } = routedExec([]);
    expect(await relinkLegacyMember({ id: "m", grade: null }, null, fn as never)).toEqual({
      status: "dormant",
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("매칭 0건 → no_match(이관·파기 없음)", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] }, // backfill: 대상 없음
      { match: /FOR UPDATE/, rows: [] }, // lookup: 매칭 없음
    ]);
    expect(await relinkLegacyMember({ id: "m", grade: null }, "hash", fn as never)).toEqual({
      status: "no_match",
    });
    expect(calls.some((c) => /DELETE FROM users/.test(c.sql))).toBe(false);
    expect(calls.some((c) => /INSERT INTO srs_states/.test(c.sql))).toBe(false);
  });

  it("🔴 다중 매칭 → ambiguous 보류(자동 흡수·파기 금지)", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] },
      { match: /FOR UPDATE/, rows: [{ id: "l1", grade: null }, { id: "l2", grade: null }] },
    ]);
    expect(await relinkLegacyMember({ id: "m", grade: null }, "hash", fn as never)).toEqual({
      status: "ambiguous",
      count: 2,
    });
    expect(calls.some((c) => /DELETE FROM users/.test(c.sql))).toBe(false);
    expect(calls.some((c) => /INSERT INTO srs_states/.test(c.sql))).toBe(false);
  });

  it("1:1 매칭 → 자식 이관 + legacy 파기(linked)", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] },
      { match: /FOR UPDATE/, rows: [{ id: "legacy_1", grade: null }] },
    ]);
    const out = await relinkLegacyMember({ id: "member_1", grade: null }, "hash", fn as never);
    expect(out).toEqual({ status: "linked", legacyId: "legacy_1" });
    // 5개 자식 테이블 이관 SQL 모두 실행(legacy_1 → member_1)
    for (const t of ["fingerprint_links", "srs_states", "streaks", "activity_log", "custom_content"]) {
      const c = calls.find((x) => new RegExp(`INSERT INTO ${t}`).test(x.sql));
      expect(c, `${t} 이관 누락`).toBeTruthy();
      expect(c!.params).toEqual(["member_1", "legacy_1"]);
    }
    // legacy 파기
    const del = calls.find((c) => /DELETE FROM users/.test(c.sql));
    expect(del!.params).toEqual(["legacy_1"]);
  });

  it("grade 승계 — member grade 없고 legacy 있으면 UPDATE(모달 값이 이후 덮어씀)", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] },
      { match: /FOR UPDATE/, rows: [{ id: "legacy_1", grade: "중2" }] },
    ]);
    await relinkLegacyMember({ id: "member_1", grade: null }, "hash", fn as never);
    const g = calls.find((c) => /UPDATE users SET grade/.test(c.sql));
    expect(g, "grade 승계 UPDATE 실행").toBeTruthy();
    expect(g!.params?.[0]).toBe("member_1");
    expect(g!.params?.[1]).toBe("중2");
  });

  it("grade 승계 안 함 — member 가 이미 grade 보유", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] },
      { match: /FOR UPDATE/, rows: [{ id: "legacy_1", grade: "중2" }] },
    ]);
    await relinkLegacyMember({ id: "member_1", grade: "고1" }, "hash", fn as never);
    expect(calls.some((c) => /UPDATE users SET grade/.test(c.sql))).toBe(false);
  });

  it("🔴 타겟 밖 legacy grade(고3) 는 승계 안 함(쓰기 정규화 — 잘못된 값 잔존 방지)", async () => {
    const { fn, calls } = routedExec([
      { match: /SELECT id, email FROM users/, rows: [] },
      { match: /FOR UPDATE/, rows: [{ id: "legacy_1", grade: "고3" }] },
    ]);
    await relinkLegacyMember({ id: "member_1", grade: null }, "hash", fn as never);
    expect(calls.some((c) => /UPDATE users SET grade/.test(c.sql))).toBe(false);
    // 단, 자식 이관·파기는 정상 진행(grade 만 스킵)
    expect(calls.some((c) => /DELETE FROM users/.test(c.sql))).toBe(true);
  });
});

describe("backfillLegacyEmailMatchHashes — 멱등 백필", () => {
  it("hash 없는 legacy row 만 §해시로 채운다(pullim-api 바이트 일치)", async () => {
    const { fn, calls } = routedExec([
      {
        match: /SELECT id, email FROM users/,
        rows: [{ id: "l1", email: "  A@B.com " }, { id: "l2", email: "c@d.com" }],
      },
    ]);
    const n = await backfillLegacyEmailMatchHashes(PEPPER, fn as never);
    expect(n).toBe(2);
    const u1 = calls.find((c) => /UPDATE users SET email_match_hash/.test(c.sql) && c.params?.[0] === "l1");
    expect(u1!.params?.[1]).toBe(computeEmailMatchHash("  A@B.com ", PEPPER));
  });

  it("대상 0건이면 UPDATE 없음(저비용 no-op)", async () => {
    const { fn, calls } = routedExec([{ match: /SELECT id, email FROM users/, rows: [] }]);
    expect(await backfillLegacyEmailMatchHashes(PEPPER, fn as never)).toBe(0);
    expect(calls.some((c) => /UPDATE/.test(c.sql))).toBe(false);
  });
});
