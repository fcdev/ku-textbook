/* 创建邀请码：pnpm invite <邀请码> [最多使用次数=1] [备注]
 * 连接哪个数据库由 DATABASE_URL 决定（不设则是本地 .data/pglite）。 */
import { getDb, schema } from "../src/db";

const [code, max = "1", ...note] = process.argv.slice(2);
if (!code) {
  console.error("用法：pnpm invite <邀请码> [最多使用次数] [备注]");
  process.exit(1);
}
(async () => {
  const db = await getDb();
  const [r] = await db.insert(schema.inviteCodes).values({ code, maxUses: Number(max), note: note.join(" ") || null }).onConflictDoNothing().returning();
  console.log(r ? `已创建邀请码 ${r.code}（可用 ${r.maxUses} 次）` : `邀请码 ${code} 已存在`);
  process.exit(0);
})();
