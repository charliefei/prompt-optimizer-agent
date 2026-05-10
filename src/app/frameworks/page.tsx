"use client";

import { useState } from "react";
import { useFrameworks } from "@/hooks/use-frameworks";
import { FrameworkSearch } from "@/components/frameworks/framework-search";
import { FrameworkGrid } from "@/components/frameworks/framework-grid";
import { Loader2, Library } from "lucide-react";

export default function FrameworksPage() {
  const [search, setSearch] = useState("");
  const [complexity, setComplexity] = useState("all");
  const [domain, setDomain] = useState("all");

  const { data: frameworks, isLoading } = useFrameworks(
    search || undefined,
    complexity !== "all" ? complexity : undefined,
    domain !== "all" ? domain : undefined
  );

  return (
    <div className="flex flex-1 flex-col p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">提示词框架库</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          浏览 57+ 种经过验证的 AI 提示词框架，找到最适合你任务的框架
        </p>
      </div>

      {/* Search & Filters */}
      <FrameworkSearch
        search={search}
        onSearchChange={setSearch}
        complexity={complexity}
        onComplexityChange={setComplexity}
        domain={domain}
        onDomainChange={setDomain}
      />

      {/* Results */}
      <div className="mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">加载框架中...</p>
          </div>
        ) : (
          <FrameworkGrid frameworks={frameworks || []} />
        )}
      </div>
    </div>
  );
}
