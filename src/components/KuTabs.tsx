"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/strings";

export default function KuTabs({ id, hasExperiment, hasQuiz }: { id: string; hasExperiment: boolean; hasQuiz: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: `/ku/${id}`, label: t.tabArticle, show: true },
    { href: `/ku/${id}/practice`, label: t.tabPractice, show: hasQuiz },
    { href: `/ku/${id}/lab`, label: t.tabLab, show: hasExperiment },
  ].filter((x) => x.show);
  return (
    <nav className="flex gap-1 border-b border-line" aria-label="学习方式">
      {tabs.map((tab) => {
        const active = path === tab.href;
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm no-underline ${active ? "border-primary font-bold text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
