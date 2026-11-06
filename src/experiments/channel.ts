"use client";
/**
 * 实验通道：让同一篇文章里的实验、正文可拖数字（Knob）、滚动联动（Stage set）和预测门槛（Predict gate）共享一份参数。
 * 没有 channel 的实验仍然各自用本地 state，行为和以前一样。
 */
import { useCallback, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { defaultParams, type ExperimentModel, type Params } from "./types";

interface Channel {
  params: Params;
  /** 还没做预测、锁着这个实验的 <Predict gate> */
  locks: Set<string>;
  /** 最近一次由文章（Stage / Knob）改动参数的时间，实验组件可以据此做过渡 */
  version: number;
  listeners: Set<() => void>;
}

const channels = new Map<string, Channel>();

function get(ch: string, model: ExperimentModel, preset: string): Channel {
  let c = channels.get(ch);
  if (!c) {
    c = { params: defaultParams(model, preset), locks: new Set(), version: 0, listeners: new Set() };
    channels.set(ch, c);
  }
  return c;
}

function emit(c: Channel) {
  for (const l of [...c.listeners]) l();
}

const noop = () => () => {};

export function setChannelParams(ch: string, model: ExperimentModel, preset: string, next: SetStateAction<Params>) {
  const c = get(ch, model, preset);
  const v = typeof next === "function" ? next(c.params) : next;
  if (v === c.params) return;
  c.params = v;
  c.version++;
  emit(c);
}

/** 和 useState<Params> 同样的接口；有 channel 时读写共享通道。 */
export function useExperimentParams(model: ExperimentModel, preset: string, channel?: string): [Params, Dispatch<SetStateAction<Params>>] {
  const [local, setLocal] = useState<Params>(() => defaultParams(model, preset));
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!channel) return noop();
      const c = get(channel, model, preset);
      c.listeners.add(cb);
      return () => c.listeners.delete(cb);
    },
    [channel, model, preset],
  );
  const snap = useCallback(() => (channel ? get(channel, model, preset).params : local), [channel, model, preset, local]);
  const shared = useSyncExternalStore(subscribe, snap, snap);
  const setShared = useCallback<Dispatch<SetStateAction<Params>>>(
    (next) => (channel ? setChannelParams(channel, model, preset, next) : setLocal(next)),
    [channel, model, preset],
  );
  return [channel ? shared : local, setShared];
}

/** 通道是否被未完成的预测锁着。 */
export function useChannelLocked(channel: string | undefined, model: ExperimentModel | undefined, preset: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!channel || !model) return noop();
      const c = get(channel, model, preset);
      c.listeners.add(cb);
      return () => c.listeners.delete(cb);
    },
    [channel, model, preset],
  );
  const snap = useCallback(() => (channel && model ? get(channel, model, preset).locks.size > 0 : false), [channel, model, preset]);
  return useSyncExternalStore(subscribe, snap, () => false);
}

export function setChannelLock(channel: string, model: ExperimentModel, preset: string, id: string, locked: boolean) {
  const c = get(channel, model, preset);
  const had = c.locks.has(id);
  if (locked === had) return;
  if (locked) c.locks.add(id);
  else c.locks.delete(id);
  emit(c);
}
