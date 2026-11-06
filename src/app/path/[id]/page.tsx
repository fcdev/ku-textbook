import { notFound } from "next/navigation";
import PathView from "@/components/PathView";
import { getContent, getKu, toMeta } from "@/lib/content";
import { t } from "@/lib/strings";

export const dynamicParams = false;
export function generateStaticParams() {
  return getContent().kus.map((k) => ({ id: k.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ku = getKu((await params).id);
  return ku ? { title: t.pathPageTitle(ku.title) } : {};
}

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ku = getKu(id);
  if (!ku) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t.pathPageTitle(ku.title)}</h1>
      {ku.summary && <p className="text-muted">{ku.summary}</p>}
      <PathView target={id} kus={getContent().kus.map(toMeta)} />
    </div>
  );
}
