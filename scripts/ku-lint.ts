/* pnpm ku:lint —— CI 和 build 前都跑。有 error 时退出码为 1。 */
import path from "node:path";
import { lintContent } from "../src/lib/lint";

const root = path.resolve(process.argv[2] ?? "content/ku");
const { kus, issues } = lintContent(root);
for (const i of issues) console[i.level === "error" ? "error" : "warn"](`${i.level === "error" ? "✗" : "!"} [${i.where}] ${i.message}`);
const errors = issues.filter((i) => i.level === "error").length;
const byStatus = kus.reduce<Record<string, number>>((a, k) => ((a[k.status] = (a[k.status] ?? 0) + 1), a), {});
console.log(`\nku-lint：${kus.length} 个 KU（${Object.entries(byStatus).map(([s, n]) => `${s} ${n}`).join("，")}），${errors} 个错误，${issues.length - errors} 个警告`);
process.exit(errors ? 1 : 0);
