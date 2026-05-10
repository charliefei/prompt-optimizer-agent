import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ComplexityBadge, DomainBadge } from "./framework-badge";
import type { FrameworkSummary } from "@/types/framework";
import { ArrowRight } from "lucide-react";

export function FrameworkCard({
  framework,
}: {
  framework: FrameworkSummary;
}) {
  return (
    <Link href={`/frameworks/${framework.id}`} className="group block">
      <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors duration-200">
              {framework.name}
            </CardTitle>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <ComplexityBadge complexity={framework.complexity} />
            {framework.domains.slice(0, 2).map((d) => (
              <DomainBadge key={d} domain={d} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {framework.scenarios.slice(0, 3).map((s, i) => (
              <span
                key={i}
                className="text-xs text-muted-foreground/70 leading-relaxed"
              >
                {s}
                {i < Math.min(framework.scenarios.length, 3) - 1 && (
                  <span className="mx-1 text-border">·</span>
                )}
              </span>
            ))}
            {framework.scenarios.length > 3 && (
              <span className="text-xs text-muted-foreground/50">
                +{framework.scenarios.length - 3}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
