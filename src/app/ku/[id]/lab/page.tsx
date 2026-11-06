import { notFound } from "next/navigation";
import ExperimentEmbed from "@/components/ExperimentEmbed";
import { experimentModels } from "@/experiments/models";
import { getContent, getKu } from "@/lib/content";

const LAB_HINTS: Record<string, string> = {
  "poly-fit": "所有参数都放开了。试试：把阶数拉到 12，再把训练点数调少；然后打开正则化 λ，看曲线怎么变乖。",
  "line-fit": "所有参数都放开了。先自己拖出一条直线，再点“自动拟合”看看最小二乘的答案；打开“误差平方”，看看哪个点贡献的损失最大。",
  "descent-1d": "所有参数都放开了。换不同的起点和学习率，点“自动播放”。找找看：学习率多大时小球开始来回跳？多大时会飞出去？",
};

export function generateStaticParams() {
  return getContent().kus.filter((k) => k.status !== "planned" && k.experiment && experimentModels[k.experiment]).map((k) => ({ id: k.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ku = getKu((await params).id);
  return ku ? { title: `实验沙盒 · ${ku.title}` } : {};
}

export default async function LabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ku = getKu(id);
  if (!ku?.experiment || !experimentModels[ku.experiment]) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-muted">{LAB_HINTS[ku.experiment] ?? "所有参数都放开了，随便玩。"}</p>
      <ExperimentEmbed id={ku.experiment} preset="lab" />
    </div>
  );
}
