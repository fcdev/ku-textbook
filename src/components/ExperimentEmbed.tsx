"use client";
import { useChannelLocked } from "@/experiments/channel";
import { experiments } from "@/experiments/registry";
import type { ExperimentProps } from "@/experiments/types";
import { t } from "@/lib/strings";

export default function ExperimentEmbed({ id, ...props }: ExperimentProps & { id: string }) {
  const def = experiments[id];
  const locked = useChannelLocked(props.channel, def, props.preset);
  if (!def) return <p className="text-bad">实验「{id}」还没有实现。</p>;
  const C = def.Component;
  if (!props.channel) return <C {...props} />;
  return (
    <div className="relative">
      <div inert={locked || undefined} aria-hidden={locked || undefined}>
        <C {...props} />
      </div>
      {locked && (
        <div className="exp-lock" role="note">
          <p className="max-w-[22em] rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-[var(--shadow-card)]">
            <span aria-hidden className="mr-1">✋</span>{t.predictLocked}
          </p>
        </div>
      )}
    </div>
  );
}
