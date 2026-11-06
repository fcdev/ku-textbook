import katex from "katex";
import type { ReactNode } from "react";
import ExperimentEmbed from "./ExperimentEmbed";

/** KaTeX 在服务端渲染成 HTML，客户端不加载 KaTeX JS（SPEC §5.1）。 */
export function Formula({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, { displayMode: true, throwOnError: false, output: "htmlAndMathml" });
  return <div className="overflow-x-auto rounded-lg bg-surface px-3 py-2" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Intuition({ children }: { children: ReactNode }) {
  return <div data-section="intuition" className="ku-level ku-prose">{children}</div>;
}
export function Theory({ children }: { children: ReactNode }) {
  return <div data-section="theory" className="ku-level ku-prose">{children}</div>;
}

export function Experiment({ id, preset = "article", sweep }: { id: string; preset?: string; sweep?: boolean }) {
  return (
    <div className="exp-block">
      <ExperimentEmbed id={id} preset={preset} showSweep={!!sweep} />
    </div>
  );
}

export function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[5.5em_1fr] sm:gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[15px]">
      <b className="mono text-sm text-ink">{label}</b>
      <span>{children}</span>
    </div>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border-l-4 border-line-strong bg-accent-soft px-4 py-3">{children}</div>;
}

export function Train({ children }: { children: ReactNode }) {
  return <span className="font-medium text-train">{children}</span>;
}
export function Test({ children }: { children: ReactNode }) {
  return <span className="font-medium text-test-text">{children}</span>;
}

export const mdxComponents = { Formula, Intuition, Theory, Experiment, Stage, Callout, Train, Test };

/**
 * 把 <Formula>tex</Formula> 改写成 <Formula tex="..." />，避免 MDX 把 _ 和 \ 当成 Markdown。
 * 用字符串属性而不是 {表达式}：next-mdx-remote 默认禁止 MDX 里的 JS 表达式。JSX 字符串属性不处理转义，
 * 反斜杠原样保留；公式里不能有英文双引号（ku-lint 会检查）。
 */
export function preprocessFormulas(src: string): string {
  return src.replace(/<Formula>([\s\S]*?)<\/Formula>/g, (_, tex: string) => `<Formula tex="${tex.trim().replace(/\s+/g, " ")}" />`);
}
