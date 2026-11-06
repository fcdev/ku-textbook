"use client";
import { useEffect, useState } from "react";
import { t } from "@/lib/strings";

type Mode = "auto" | "light" | "dark";
const next: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const label: Record<Mode, string> = { auto: t.themeAuto, light: t.themeLight, dark: t.themeDark };

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => {
    const v = document.documentElement.dataset.theme;
    if (v === "light" || v === "dark") setMode(v);
  }, []);
  const apply = (m: Mode) => {
    setMode(m);
    try {
      if (m === "auto") {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem("ku-theme");
      } else {
        document.documentElement.dataset.theme = m;
        localStorage.setItem("ku-theme", m);
      }
    } catch {
      if (m !== "auto") document.documentElement.dataset.theme = m;
    }
  };
  return (
    <button type="button" onClick={() => apply(next[mode])} className="min-h-9 whitespace-nowrap rounded-full border border-line px-2.5 text-xs text-muted hover:text-ink" aria-label={`主题：${label[mode]}，点击切换`}>
      {label[mode]}
    </button>
  );
}
