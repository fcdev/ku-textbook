/** 静止模式的存储键和首帧脚本（服务端也要用，所以不放在 "use client" 文件里）。 */
export const STILL_KEY = "ku-still";

/** 放进 <head> 的内联脚本：用户选过就按用户的，没选过跟随系统的“减少动态效果”。 */
export const STILL_INIT_SCRIPT = `try{var s=localStorage.getItem("${STILL_KEY}");if(s==="1"||(s===null&&matchMedia("(prefers-reduced-motion: reduce)").matches))document.documentElement.dataset.still="1"}catch(e){}`;
