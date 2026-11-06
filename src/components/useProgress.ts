"use client";
import { useEffect, useState } from "react";
import { readProgress, subscribeProgress, type Progress } from "@/lib/progress";

export function useProgress(): Progress {
  const [p, setP] = useState<Progress>({});
  useEffect(() => {
    setP(readProgress());
    return subscribeProgress(() => setP(readProgress()));
  }, []);
  return p;
}
