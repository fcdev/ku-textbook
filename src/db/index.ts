import "server-only";
import path from "node:path";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * 数据库连接。
 * - 有 DATABASE_URL（postgres://…）：连 PostgreSQL。
 * - 没有：用内嵌的 PGlite（数据在 .data/pglite），本地开发和演示不用装数据库。
 * - DATABASE_URL=pglite://memory：内存库，给测试用。
 * 首次连接时自动跑 drizzle/ 下的迁移。
 */
let ready: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  ready ??= open().catch((e) => {
    ready = null; // 下次请求重试
    throw e;
  });
  return ready;
}

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL ?? "";
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  let db: Db;
  if (url.startsWith("postgres")) {
    const { default: postgres } = await import("postgres");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    db = drizzlePg(postgres(url, { max: 5 }), { schema });
    await migrate(db, { migrationsFolder });
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    let client;
    if (url === "pglite://memory") client = new PGlite();
    else {
      const dir = path.join(process.cwd(), ".data", "pglite");
      (await import("node:fs")).mkdirSync(dir, { recursive: true });
      client = new PGlite(dir);
    }
    const pdb = drizzle(client, { schema });
    await migrate(pdb, { migrationsFolder });
    db = pdb as unknown as Db;
  }
  await seedInvite(db);
  return db;
}

/** 非生产环境、或设置了 SEED_INVITE 时，确保有一个可用的邀请码。 */
async function seedInvite(db: Db) {
  const code = process.env.SEED_INVITE ?? (process.env.NODE_ENV === "production" ? "" : "KU-DEMO");
  if (!code) return;
  await db.insert(schema.inviteCodes).values({ code, note: "自动创建的演示邀请码", maxUses: 1000 }).onConflictDoNothing();
}

export { schema };
