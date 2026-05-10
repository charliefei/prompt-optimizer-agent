"use client";

import { SearchX } from "lucide-react";
import { FrameworkCard } from "./framework-card";
import type { FrameworkSummary } from "@/types/framework";

export function FrameworkGrid({
  frameworks,
}: {
  frameworks: FrameworkSummary[];
}) {
  if (frameworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <SearchX className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-base font-medium text-muted-foreground">
          没有找到匹配的框架
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          试试调整搜索条件或筛选器
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {frameworks.map((f, i) => (
        <div
          key={f.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          <FrameworkCard framework={f} />
        </div>
      ))}
    </div>
  );
}
