"use client";

import { use } from "react";
import { useFramework } from "@/hooks/use-frameworks";
import { ComplexityBadge, DomainBadge } from "@/components/frameworks/framework-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

export default function FrameworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: framework, isLoading } = useFramework(parseInt(id));

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">加载框架详情...</p>
        </div>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-base font-medium text-muted-foreground">
          框架未找到
        </p>
        <Link href="/frameworks">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回框架库
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        href="/frameworks"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        返回框架库
      </Link>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {framework.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <ComplexityBadge complexity={framework.complexity} />
            {framework.domains.map((d) => (
              <DomainBadge key={d} domain={d} />
            ))}
          </div>
          {framework.sourceUrl && (
            <a
              href={framework.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              查看来源
            </a>
          )}
        </div>
        <Link href={`/chat?frameworkId=${framework.id}`}>
          <Button size="lg" className="shadow-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            使用此框架
          </Button>
        </Link>
      </div>

      {/* Overview */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">概述</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {framework.overview}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Scenarios */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">应用场景</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {framework.scenarios.map((s, i) => (
                <Badge key={i} variant="outline" className="text-sm font-normal py-1 px-3">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Components Table */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">框架构成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      组成部分
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      英文
                    </th>
                    <th className="text-left py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      说明
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {framework.components.map((c, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {c.name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">
                        {c.englishName}
                      </td>
                      <td className="py-3 text-muted-foreground leading-relaxed">
                        {c.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Detailed Explanations */}
      {framework.detailedExplanations.length > 0 && (
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">详细说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {framework.detailedExplanations.map((d, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-sm mb-2 text-foreground">
                    {d.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {d.content}
                  </p>
                  {i < framework.detailedExplanations.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Pros & Cons */}
      <section className="grid gap-6 sm:grid-cols-2 mb-6">
        <Card className="border-emerald-200/60 dark:border-emerald-800/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              优点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {framework.pros.map((p, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-rose-200/60 dark:border-rose-800/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <XCircle className="h-4 w-4" />
              </div>
              缺点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {framework.cons.map((c, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Examples */}
      {framework.examples.length > 0 && (
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最佳实践</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {framework.examples.map((ex, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-sm mb-3 text-foreground">
                    {ex.title}
                  </h3>
                  <div className="rounded-xl bg-muted/70 border border-border/50 p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/85">
                    {ex.content}
                  </div>
                  {i < framework.examples.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
