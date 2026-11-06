"use client";
import { experiments } from "@/experiments/registry";
import type { ExperimentProps } from "@/experiments/types";

export default function ExperimentEmbed({ id, ...props }: ExperimentProps & { id: string }) {
  const def = experiments[id];
  if (!def) return <p className="text-bad">实验「{id}」还没有实现。</p>;
  const C = def.Component;
  return <C {...props} />;
}
