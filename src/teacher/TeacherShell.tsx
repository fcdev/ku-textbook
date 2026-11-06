"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { tt } from "@/lib/strings";
import type { Teacher } from "@/lib/teacher-types";
import { isDemo, type TeacherApi } from "./api";
import { DEMO_INVITE } from "./demo-const";

export function DemoBanner() {
  if (!isDemo) return null;
  return <p className="rounded-lg border border-line bg-accent-soft px-4 py-2 text-sm">{tt.demoBanner(DEMO_INVITE)}</p>;
}

export default function TeacherShell({ api, teacher, children, back }: { api: TeacherApi | null; teacher: Teacher | null; children: ReactNode; back?: { href: string; label: string } }) {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <DemoBanner />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {back && <Link href={back.href} className="text-muted no-underline hover:text-ink">{back.label}</Link>}
        {teacher && (
          <span className="ml-auto flex items-center gap-3 text-muted">
            {teacher.name}{teacher.school ? ` · ${teacher.school}` : ""}
            <button type="button" className="min-h-9 rounded-full border border-line px-3 text-xs hover:text-ink"
              onClick={async () => { await api?.logout(); router.replace("/teacher/login"); }}>
              {tt.logout}
            </button>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function Spinner() {
  return <p className="py-10 text-center text-muted">加载中……</p>;
}
