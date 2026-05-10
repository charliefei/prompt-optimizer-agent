import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplexityBadge, DomainBadge } from "./framework-badge";
import type { FrameworkSummary } from "@/types/framework";
import { ArrowRight } from "lucide-react";

export function FrameworkCard({ framework }: { framework: FrameworkSummary }) {
  return (
    <Link href={`/frameworks/${framework.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {framework.name}
            </CardTitle>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <ComplexityBadge complexity={framework.complexity} />
            {framework.domains.slice(0, 2).map((d) => (
              <DomainBadge key={d} domain={d} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {framework.scenarios.slice(0, 3).map((s, i) => (
              <span key={i} className="text-xs text-muted-foreground">
                {s}{i < Math.min(framework.scenarios.length, 3) - 1 ? " · " : ""}
              </span>
            ))}
            {framework.scenarios.length > 3 && (
              <span className="text-xs text-muted-foreground">+{framework.scenarios.length - 3}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
