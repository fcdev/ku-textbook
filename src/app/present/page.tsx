import { Suspense } from "react";
import Present from "@/teacher/Present";
import { teacherContent } from "@/teacher/content";

export const metadata = { title: "投屏" };
export default function Page() {
  return <Suspense><Present content={teacherContent()} /></Suspense>;
}
