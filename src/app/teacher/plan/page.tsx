import { Suspense } from "react";
import PlanEditor from "@/teacher/PlanEditor";
import { teacherContent } from "@/teacher/content";

export const metadata = { title: "教案" };
export default function Page() {
  return <Suspense><PlanEditor content={teacherContent()} /></Suspense>;
}
