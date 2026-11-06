import { Suspense } from "react";
import LoginForm from "@/teacher/LoginForm";

export const metadata = { title: "老师登录" };
export default function Page() {
  return <Suspense><LoginForm /></Suspense>;
}
