import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const complexityConfig = {
  simple: {
    label: "简单",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  medium: {
    label: "中等",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  complex: {
    label: "复杂",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  },
};

export function ComplexityBadge({
  complexity,
}: {
  complexity: "simple" | "medium" | "complex";
}) {
  const config = complexityConfig[complexity];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function DomainBadge({ domain }: { domain: string }) {
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      {domain}
    </Badge>
  );
}
