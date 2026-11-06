"use client";
/**
 * 静止模式：关掉所有动效（自动播放直接跳到结果、3D 不自动旋转、CSS 过渡关闭）。
 * 默认跟随系统的“减少动态效果”；用户手动切换后存在 localStorage。状态写在 <html data-still="1">，
 * 首帧前由 layout 里的内联脚本设置，避免闪动。
 */
import { useSyncExternalStore } from "react";

import { STILL_KEY } from "./still-init";
const EVENT = "ku-still";

export const isStill = () => typeof document !== "undefined" && document.documentElement.dataset.still === "1";

export function setStill(on: boolean) {
  if (on) document.documentElement.dataset.still = "1";
  else delete document.documentElement.dataset.still;
  try {
    localStorage.setItem(STILL_KEY, on ? "1" : "0");
  } catch {
    /* 存不了就只对本页生效 */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useStill(): boolean {
  return useSyncExternalStore(subscribe, isStill, () => false);
}

