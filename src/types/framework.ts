export interface FrameworkSummary {
  id: number;
  name: string;
  fileName: string;
  scenarios: string[];
  complexity: "simple" | "medium" | "complex";
  domains: string[];
}

export interface FrameworkComponent {
  name: string;
  englishName: string;
  description: string;
}

export interface Framework extends FrameworkSummary {
  sourceUrl: string;
  overview: string;
  components: FrameworkComponent[];
  detailedExplanations: { title: string; content: string }[];
  pros: string[];
  cons: string[];
  examples: { title: string; content: string }[];
  rawMarkdown: string;
}

export interface UserFramework {
  id: string;
  name: string;
  description: string;
  scenarios: string[];
  rawMarkdown: string;
  score: number;
  scoreDetails: Record<string, { score: number; reason: string }>;
  createdAt: string;
}

export interface ScoreResult {
  score: number;
  details: Record<string, { score: number; reason: string }>;
}
