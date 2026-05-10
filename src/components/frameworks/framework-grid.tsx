"use client";

import { FrameworkCard } from "./framework-card";
import type { FrameworkSummary } from "@/types/framework";

export function FrameworkGrid({ frameworks }: { frameworks: FrameworkSummary[] }) {
  if (frameworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">没有找到匹配的框架</p>
        <p className="text-sm">尝试调整搜索条件</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {frameworks.map((f) => (
        <FrameworkCard key={f.id} framework={f} />
      ))}
    </div>
  );
}
