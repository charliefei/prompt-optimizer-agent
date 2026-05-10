"use client";

import { use } from "react";
import { useFramework } from "@/hooks/use-frameworks";
import { ComplexityBadge, DomainBadge } from "@/components/frameworks/framework-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function FrameworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: framework, isLoading } = useFramework(parseInt(id));

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">框架未找到</p>
        <Link href="/frameworks">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回框架库
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/frameworks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回框架库
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{framework.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <ComplexityBadge complexity={framework.complexity} />
              {framework.domains.map((d) => (
                <DomainBadge key={d} domain={d} />
              ))}
            </div>
          </div>
          <Link href={`/chat?frameworkId=${framework.id}`}>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              使用此框架
            </Button>
          </Link>
        </div>
      </div>

      {framework.sourceUrl && (
        <a
          href={framework.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4"
        >
          <ExternalLink className="h-3 w-3" />
          来源链接
        </a>
      )}

      {/* Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>概述</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{framework.overview}</p>
        </CardContent>
      </Card>

      {/* Scenarios */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>应用场景</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {framework.scenarios.map((s, i) => (
              <Badge key={i} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>框架构成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">组成部分</th>
                  <th className="text-left py-2 pr-4 font-medium">英文</th>
                  <th className="text-left py-2 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {framework.components.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.englishName}</td>
                    <td className="py-2 text-muted-foreground">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Explanations */}
      {framework.detailedExplanations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>详细说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {framework.detailedExplanations.map((d, i) => (
              <div key={i}>
                <h3 className="font-medium mb-2">{d.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{d.content}</p>
                {i < framework.detailedExplanations.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pros & Cons */}
      <div className="grid gap-6 sm:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              优点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {framework.pros.map((p, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              缺点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {framework.cons.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Examples */}
      {framework.examples.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>最佳实践</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {framework.examples.map((ex, i) => (
              <div key={i}>
                <h3 className="font-medium mb-2">{ex.title}</h3>
                <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{ex.content}</div>
                {i < framework.examples.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
