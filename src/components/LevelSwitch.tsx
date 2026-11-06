"use client";
import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/strings";

type Level = "intuition" | "theory";

/** 直觉 / 原理切换。两层都在服务端渲染好，这里只切显示，并同步到 ?level=theory。 */
export default function LevelSwitch({ children, hasTheory }: { children: ReactNode; hasTheory: boolean }) {
  const [level, setLevel] = useState<Level>("intuition");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("level") === "theory") setLevel("theory");
  }, []);
  const pick = (l: Level) => {
    setLevel(l);
    const u = new URL(location.href);
    if (l === "theory") u.searchParams.set("level", "theory");
    else u.searchParams.delete("level");
    history.replaceState(null, "", u);
  };
  return (
    <div className="ku-switch space-y-6" data-level={level}>
      {hasTheory && (
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="内容深度">
          {(["intuition", "theory"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => pick(l)}
              className={`min-h-10 rounded-full px-5 text-sm ${level === l ? "bg-primary font-bold text-on-primary" : "text-muted hover:text-ink"}`}>
              {l === "intuition" ? t.levelIntuition : t.levelTheory}
            </button>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
