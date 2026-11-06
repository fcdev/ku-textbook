"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Teacher } from "@/lib/teacher-types";
import { teacherApi, type TeacherApi } from "./api";

/** 取当前老师；没登录时跳到登录页。 */
export function useTeacher(redirect = true) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<{ api: TeacherApi | null; teacher: Teacher | null; loading: boolean }>({ api: null, teacher: null, loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      const api = await teacherApi();
      const teacher = await api.me().catch(() => null);
      if (!alive) return;
      setState({ api, teacher, loading: false });
      if (!teacher && redirect) router.replace(`/teacher/login?next=${encodeURIComponent(pathname + (search ? `?${search}` : ""))}`);
    })();
    return () => { alive = false; };
  }, [redirect, router, pathname, search]);
  return state;
}
