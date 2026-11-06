import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  note: text("note"),
  maxUses: integer("max_uses").notNull().default(1),
  used: integer("used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  school: text("school").notNull().default(""),
  phone: text("phone").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  inviteCodeId: uuid("invite_code_id").references(() => inviteCodes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kuIds: text("ku_ids").array().notNull().default([]),
  learnedKuIds: text("learned_ku_ids").array().notNull().default([]),
  stage: text("stage").notNull().default("高中"),
  periods: integer("periods").notNull().default(1),
  subject: text("subject").notNull().default("数学"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonPlans = pgTable("lesson_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  contentMd: text("content_md").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});
