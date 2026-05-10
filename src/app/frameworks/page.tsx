"use client";

import { useState } from "react";
import { useFrameworks } from "@/hooks/use-frameworks";
import { FrameworkSearch } from "@/components/frameworks/framework-search";
import { FrameworkGrid } from "@/components/frameworks/framework-grid";

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
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">提示词框架库</h1>
        <p className="text-muted-foreground mt-1">
          浏览 57+ 种经过验证的 AI 提示词框架，找到最适合你任务的框架
        </p>
      </div>

      <FrameworkSearch
        search={search}
        onSearchChange={setSearch}
        complexity={complexity}
        onComplexityChange={setComplexity}
        domain={domain}
        onDomainChange={setDomain}
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <FrameworkGrid frameworks={frameworks || []} />
        )}
      </div>
    </div>
  );
}
