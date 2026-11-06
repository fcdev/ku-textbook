import Link from "next/link";
import ExperimentEmbed from "@/components/ExperimentEmbed";
import { getContent } from "@/lib/content";

export const metadata = { title: "实验室", description: "3D 损失曲面上的梯度下降、在浏览器里训练神经网络。" };

export default function PlayPage() {
  const labs = getContent().kus.filter((k) => k.status !== "planned" && k.experiment);
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">实验室</h1>
        <p className="text-muted">不讲道理，只管动手。所有计算都在你的浏览器里完成，不连服务器。</p>
      </section>

      <section className="space-y-3" aria-labelledby="h-surface">
        <h2 id="h-surface" className="text-2xl font-bold">在损失曲面上下山</h2>
        <p className="text-muted">
          三种地形：椭圆碗（一个方向陡、一个方向缓）、两个山谷（起点决定落进哪个谷）、弯曲峡谷（谷底又窄又弯）。
          点曲面设起点，调学习率和动量，看小球怎么走。拖动可以旋转视角。
        </p>
        <div className="mx-auto max-w-3xl"><ExperimentEmbed id="descent-2d" preset="lab" /></div>
      </section>

      <section className="space-y-3" aria-labelledby="h-net">
        <h2 id="h-net" className="text-2xl font-bold">训练一个小神经网络</h2>
        <p className="text-muted">
          神经网络要把黄点和黑点分开。点“开始训练”，看决策边界一点点长出来。试试：圆环数据用 1 个神经元能分开吗？螺旋要几层？
          也可以选“点图加点”，自己往图上放数据捣乱。
        </p>
        <div className="mx-auto max-w-3xl"><ExperimentEmbed id="tiny-net" preset="lab" /></div>
      </section>

      <section className="space-y-3" aria-labelledby="h-more">
        <h2 id="h-more" className="text-2xl font-bold">知识点里的实验沙盒</h2>
        <ul className="flex flex-wrap gap-2">
          {labs.map((k) => (
            <li key={k.id}>
              <Link href={`/ku/${k.id}/lab`} className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm text-ink no-underline hover:border-primary">
                {k.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
