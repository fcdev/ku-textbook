"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { tt } from "@/lib/strings";
import { ApiError, teacherApi } from "./api";
import { DemoBanner } from "./TeacherShell";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(sp.get("mode") === "register" ? "register" : "login");
  const [f, setF] = useState({ inviteCode: "", name: "", school: "", account: "", password: "" });
  const [err, setErr] = useState<{ msg: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const next = sp.get("next");
  const safeNext = next && /^\/(teacher|present)(\/|\?|$)/.test(next) ? next : "/teacher";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const api = await teacherApi();
      if (mode === "login") await api.login(f.account, f.password);
      else await api.register(f);
      router.replace(safeNext);
    } catch (e2) {
      const ae = e2 instanceof ApiError ? e2 : null;
      setErr({ msg: ae?.message ?? "出错了，请稍后再试", field: ae?.code === "invite" ? "inviteCode" : ae?.code === "account" || ae?.code === "exists" ? "account" : undefined });
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof f, label: string, type = "text", autoComplete?: string) => (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      <input
        name={key} type={type} required={key !== "school"} autoComplete={autoComplete} value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        aria-invalid={err?.field === key}
        className={`h-12 w-full rounded-xl border bg-surface px-4 text-base outline-none focus:border-focus ${err?.field === key ? "border-bad" : "border-line"}`}
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-md space-y-5">
      <DemoBanner />
      <h1 className="text-3xl font-bold">{mode === "login" ? tt.loginTitle : tt.registerTitle}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-[var(--radius-ku)] border border-line bg-surface p-5">
        {mode === "register" && field("inviteCode", tt.inviteCode)}
        {mode === "register" && field("name", tt.name, "text", "name")}
        {mode === "register" && field("school", tt.school, "text", "organization")}
        {field("account", tt.account, "text", "username")}
        {field("password", tt.password, "password", mode === "login" ? "current-password" : "new-password")}
        {err && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">✕ {err.msg}</p>}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-primary font-bold text-on-primary disabled:opacity-50">
          {mode === "login" ? tt.login : tt.register}
        </button>
      </form>
      <button type="button" className="text-sm text-focus underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}>
        {mode === "login" ? tt.toRegister : tt.toLogin}
      </button>
    </div>
  );
}
