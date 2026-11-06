import { notFound } from "next/navigation";
import Practice from "@/components/Practice";
import { getContent, getKu } from "@/lib/content";
import { successors } from "@/lib/graph";

export function generateStaticParams() {
  return getContent().kus.filter((k) => k.status !== "planned" && k.quiz.length > 0).map((k) => ({ id: k.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ku = getKu((await params).id);
  return ku ? { title: `闯关 · ${ku.title}` } : {};
}

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ku = getKu(id);
  if (!ku || ku.quiz.length === 0) notFound();
  const { graph } = getContent();
  const next = successors(graph, id).map((s) => graph.byId.get(s)!.title);
  return <Practice kuId={ku.id} title={ku.title} quiz={ku.quiz} unlocks={next} />;
}
