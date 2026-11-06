import { z } from "zod";

export const KU_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const kuId = z.string().regex(KU_ID, "id 只能用小写字母、数字和短横线");

export const KU_STATUSES = ["planned", "draft", "review", "published"] as const;

export const frontmatterSchema = z
  .object({
    id: kuId,
    title: z.string().min(1),
    summary: z.string().max(40, "summary 不超过 40 字").optional(),
    prerequisites: z.array(kuId).default([]),
    experiment: z.string().optional(),
    links: z.record(z.string(), z.array(z.string())).default({}),
    reading: z.array(z.object({ title: z.string(), url: z.url().optional() })).default([]),
    status: z.enum(KU_STATUSES),
    authors: z.array(z.string()).default([]),
    reviewers: z.array(z.string()).default([]),
    estMinutes: z.number().int().positive().optional(),
    /** 《Understanding Deep Learning》章节号，只用于延伸阅读和教师端分组 */
    chapter: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((fm, ctx) => {
    if (fm.status !== "planned") {
      if (!fm.summary) ctx.addIssue({ code: "custom", path: ["summary"], message: "非 planned 的 KU 必须有 summary" });
      if (!fm.estMinutes) ctx.addIssue({ code: "custom", path: ["estMinutes"], message: "非 planned 的 KU 必须有 estMinutes" });
    }
  });

export type KuFrontmatter = z.infer<typeof frontmatterSchema>;

export const CHECK_OPS = ["<", "<=", ">", ">=", "between", "near-min", "near-max"] as const;

const experimentRef = z
  .object({
    id: z.string(),
    preset: z.string().default("practice"),
    hide: z.array(z.string()).default([]),
  })
  .strict();

const checkSchema = z.discriminatedUnion("op", [
  z.object({ metric: z.string(), op: z.enum(["<", "<=", ">", ">="]), value: z.number() }).strict(),
  z.object({ metric: z.string(), op: z.literal("between"), value: z.tuple([z.number(), z.number()]) }).strict(),
  z
    .object({
      metric: z.string(),
      op: z.enum(["near-min", "near-max"]),
      over: z.string(),
      tolerance: z.object({ steps: z.number().int().min(0).default(0), ratio: z.number().positive().default(1) }).strict().default({ steps: 0, ratio: 1 }),
    })
    .strict(),
]);

export type QuizCheck = z.infer<typeof checkSchema>;

const base = {
  id: z.string().min(1),
  prompt: z.string().min(1),
  hint: z.string().optional(),
  explain: z.string().optional(),
};

export const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("choice"), options: z.array(z.string()).min(2), answer: z.number().int().min(0) }).strict()
    .refine((q) => q.answer < q.options.length, { message: "answer 超出选项范围", path: ["answer"] }),
  z.object({ ...base, type: z.literal("experiment-target"), experiment: experimentRef, check: checkSchema }).strict(),
]);

export const quizSchema = z.array(questionSchema).superRefine((qs, ctx) => {
  const seen = new Set<string>();
  qs.forEach((q, i) => {
    if (seen.has(q.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `题目 id 重复：${q.id}` });
    seen.add(q.id);
  });
});

export type Question = z.infer<typeof questionSchema>;
export type ChoiceQuestion = Extract<Question, { type: "choice" }>;
export type ExperimentQuestion = Extract<Question, { type: "experiment-target" }>;
