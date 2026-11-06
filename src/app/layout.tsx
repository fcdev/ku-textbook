import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { t, tt } from "@/lib/strings";

export const metadata: Metadata = {
  title: { default: t.siteName, template: `%s · ${t.siteName}` },
  description: t.siteTagline,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 首帧前应用用户手动选择的主题，避免闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("ku-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only">{t.skipToContent}</a>
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
            <Link href="/" className="font-display text-lg font-bold text-ink no-underline">{t.siteName}</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-muted no-underline hover:text-ink">{t.navMap}</Link>
              <Link href="/teacher" className="text-muted no-underline hover:text-ink">{tt.navTeacher}</Link>
            </nav>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
