import { Suspense } from "react";
import CourseList from "@/teacher/CourseList";

export const metadata = { title: "我的课程" };
export default function Page() {
  return <Suspense><CourseList /></Suspense>;
}
