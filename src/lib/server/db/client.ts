// games Postgres 클라이언트 — pg.Pool 싱글톤 + 시작 시 마이그레이션 러너.
// 근거: proc/plan/2026-05-29_auth-login-signup.md (arcade 패턴 차용, 코드 복사 아님).
//
// 정책:
// - dev: docker-compose Postgres (localhost:5436) — SSL off.
// - prod: games 전용 Supabase (DATABASE_URL 주입) — TLS 인증서 검증 ON (기본).
//   Supabase 는 정상 인증서를 제공하므로 기본 검증 유지. 특수 체인 예외가 정말
//   필요할 때만 PGSSL_NO_VERIFY=1 로 명시적으로 검증 해제(권장 X).
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
    ssl: resolveSsl(url),
  });
}

/**
 * SSL 설정 해소.
 * - 로컬 docker: SSL 미사용.
 * - 원격(Supabase 등): 기본 인증서 검증 ON(`true`). MITM·잘못된 체인을 막는다.
 * - 탈출구: PGSSL_NO_VERIFY=1 일 때만 검증 해제(특수 체인 대응, 권장 X).
 */
function resolveSsl(url: string): boolean | { rejectUnauthorized: boolean } | undefined {
  if (isLocalHost(url)) return undefined;
  if (process.env.PGSSL_NO_VERIFY === "1") return { rejectUnauthorized: false };
  return true;
}

/** Pool 싱글톤. 최초 호출 시 생성 + 마이그레이션 1회 실행. */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = createPool();
  }
  if (!migrationsReady) {
    // 실패 시 rejected promise 가 고정되면 warm instance 가 영구 장애가 된다.
    // 실패하면 migrationsReady 를 null 로 되돌려 다음 요청에서 재시도하게 한다.
    migrationsReady = runMigrations(pool).catch((err) => {
      migrationsReady = null;
      throw err;
    });
  }
  await migrationsReady;
  return pool;
}

/**
 * 쿼리 실행자 타입. pool 직접 실행(`query`)과 트랜잭션 client(`withTx` 의 q)가 같은
 * 시그니처를 공유 — DB 헬퍼가 둘 중 무엇으로든 실행되게 해 트랜잭션 합성을 가능케 한다.
 */
export type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: T[]; rowCount: number }>;

/** 파라미터라이즈드 쿼리 헬퍼 (pool). */
export const query: QueryFn = async (text, params) => {
  const p = await getPool();
  const res = await p.query(text, params as never);
  return { rows: res.rows as never, rowCount: res.rowCount ?? 0 };
};

/** 트랜잭션 헬퍼. 콜백에 트랜잭션 바인딩된 QueryFn 을 넘긴다. */
export async function withTx<T>(fn: (q: QueryFn) => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const q: QueryFn = async (text, params) => {
      const res = await client.query(text, params as never);
      return { rows: res.rows as never, rowCount: res.rowCount ?? 0 };
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

/** Postgres UNIQUE 제약 위반(23505) 여부. 경합으로 인한 중복 INSERT 식별용. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
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
  } catch (err) {
    // ENOENT(디렉토리 부재)만 "적용할 것 없음" 으로 무시. 번들 누락(tracing 오타)·권한·
    // 읽기 실패 등 다른 fs 오류는 삼키지 않고 surface — 원인불명 500 으로 숨기지 않기 위해.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
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
