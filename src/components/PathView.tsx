"use client";
import { useMemo } from "react";
import { buildGraph, closure, topoSort } from "@/lib/graph";
import type { KuMeta } from "@/lib/content";
import PathList from "./PathList";
import { useProgress } from "./useProgress";

export default function PathView({ target, kus }: { target: string; kus: KuMeta[] }) {
  const graph = useMemo(() => buildGraph(kus), [kus]);
  const path = useMemo(() => topoSort(graph, closure(graph, [target])), [graph, target]);
  return <PathList path={path} kus={graph} done={useProgress()} />;
}
