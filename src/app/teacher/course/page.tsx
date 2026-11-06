import { Suspense } from "react";
import CourseEditor from "@/teacher/CourseEditor";
import { teacherContent } from "@/teacher/content";

export const metadata = { title: "组课" };
export default function Page() {
  return <Suspense><CourseEditor content={teacherContent()} /></Suspense>;
}
