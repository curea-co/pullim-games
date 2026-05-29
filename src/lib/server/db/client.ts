// games Postgres 클라이언트 — pg.Pool 싱글톤 + 시작 시 마이그레이션 러너.
// 근거: proc/plan/2026-05-29_auth-login-signup.md (arcade 패턴 차용, 코드 복사 아님).
//
// 정책:
// - dev: docker-compose Postgres (localhost:5436) — SSL off.
// - prod: games 전용 Supabase (DATABASE_URL 주입) — SSL on.
// - 마이그레이션: migrations/*.sql 알파벳순, schema_migrations 로 적용 추적. 도구 미도입.

import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

let pool: Pool | null = null;
let migrationsReady: Promise<void> | null = null;

function isLocalHost(url: string): boolean {
  return (
    url.includes("@localhost") ||
    url.includes("@127.0.0.1") ||
    url.includes("@host.docker.internal")
  );
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL 미설정 — games 계정 기능에는 Postgres 연결이 필요합니다. " +
        "dev: `docker compose up -d db` 후 .env.local 의 DATABASE_URL 설정. " +
        "prod: games 전용 Supabase URL.",
    );
  }
  return new Pool({
    connectionString: url,
    // 로컬 docker 는 SSL 미사용. Supabase 등 원격은 TLS (self-signed 체인 허용).
    ssl: isLocalHost(url) ? undefined : { rejectUnauthorized: false },
  });
}

/** Pool 싱글톤. 최초 호출 시 생성 + 마이그레이션 1회 실행. */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = createPool();
  }
  if (!migrationsReady) {
    migrationsReady = runMigrations(pool);
  }
  await migrationsReady;
  return pool;
}

/** 파라미터라이즈드 쿼리 헬퍼. */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const p = await getPool();
  const res = await p.query(text, params as never);
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}

/** 트랜잭션 헬퍼. */
export async function withTx<T>(fn: (q: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>) => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const q = async (text: string, params?: unknown[]) => {
      const res = await client.query(text, params as never);
      return { rows: res.rows as Record<string, unknown>[], rowCount: res.rowCount ?? 0 };
    };
    const out = await fn(q);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// games 마이그레이션 전용 advisory lock 키 (임의 상수).
const MIGRATION_LOCK_KEY = 832914;

/**
 * migrations/*.sql 을 알파벳순으로 적용. schema_migrations(filename PK) 로 추적.
 *
 * 동시성/풀러 안전: 전체를 단일 트랜잭션으로 묶고 `pg_advisory_xact_lock` 을 건다.
 * - 트랜잭션 advisory lock 은 commit/rollback 시 자동 해제되고, 같은 트랜잭션 = 같은
 *   backend 라서 transaction-mode 풀러(Supabase Supavisor 6543, pgBouncer)에서도
 *   안전하다. (세션 advisory lock 은 풀러에서 쿼리마다 backend 가 바뀌어 보장 X.)
 * - Vercel 서버리스 동시 cold start: 한 트랜잭션만 lock 획득, 나머지는 대기 후
 *   "이미 적용됨" 을 보고 통과. INSERT 는 ON CONFLICT DO NOTHING 으로 이중 안전.
 * - 모든 마이그레이션 DDL 이 IF NOT EXISTS 라 재실행도 무해.
 */
async function runMigrations(p: Pool): Promise<void> {
  const dir = path.join(process.cwd(), "migrations");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return; // migrations/ 부재 — 적용할 것 없음.
  }
  if (files.length === 0) return;

  // 파일 내용을 먼저 읽어 트랜잭션 점유 시간을 최소화.
  const sqls = await Promise.all(
    files.map(async (file) => ({ file, sql: await readFile(path.join(dir, file), "utf8") })),
  );

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename   TEXT PRIMARY KEY,
         applied_at BIGINT NOT NULL
       )`,
    );
    const applied = new Set(
      (
        await client.query<{ filename: string }>("SELECT filename FROM schema_migrations")
      ).rows.map((r) => r.filename),
    );

    for (const { file, sql } of sqls) {
      if (applied.has(file)) continue;
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [file, Date.now()],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(`마이그레이션 실패 — ${(err as Error).message}`);
  } finally {
    client.release();
  }
}
