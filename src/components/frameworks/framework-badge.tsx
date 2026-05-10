import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const complexityColors = {
  simple: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  complex: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const complexityLabels = {
  simple: "简单",
  medium: "中等",
  complex: "复杂",
};

export function ComplexityBadge({ complexity }: { complexity: "simple" | "medium" | "complex" }) {
  return (
    <Badge variant="outline" className={cn("text-xs", complexityColors[complexity])}>
      {complexityLabels[complexity]}
    </Badge>
  );
}

export function DomainBadge({ domain }: { domain: string }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {domain}
    </Badge>
  );
}
