import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getFrameworkSummaries } from "@/lib/frameworks";
import type { Analysis, FrameworkMatch } from "../state";

export async function matchFrameworks(analysis: Analysis): Promise<FrameworkMatch[]> {
  const summaries = await getFrameworkSummaries();

  const scored = summaries.map((s) => {
    let score = 0;

    // Scenario keyword overlap (highest weight)
    const scenarioOverlap = s.scenarios.filter((scenario) =>
      analysis.keyRequirements.some(
        (req) => scenario.includes(req) || req.includes(scenario)
      )
    ).length;
    score += scenarioOverlap * 30;

    // Complexity match
    if (s.complexity === analysis.complexity) score += 20;

    // Domain match
    if (s.domains.includes(analysis.domain)) score += 25;

    // Task type keyword match
    const taskLower = analysis.taskType.toLowerCase();
    if (s.name.toLowerCase().includes(taskLower)) score += 15;
    if (s.scenarios.some((sc) => sc.includes(taskLower))) score += 15;

    return { framework: s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((s) => ({
    id: s.framework.id,
    name: s.framework.name,
    reason: `匹配度: ${s.score}分 - ${s.framework.scenarios.slice(0, 2).join("、")}`,
  }));
}

export const matchFrameworkTool = tool(
  async ({ taskType, complexity, domain, keyRequirements }) => {
    const matches = await matchFrameworks({
      taskType,
      complexity,
      domain,
      keyRequirements,
      ambiguities: [],
    });
    return JSON.stringify(matches);
  },
  {
    name: "match_framework",
    description: "根据用户任务类型、复杂度和领域，匹配最合适的提示词框架。返回前3个最佳匹配。",
    schema: z.object({
      taskType: z.string().describe("任务类型描述"),
      complexity: z.enum(["simple", "medium", "complex"]).describe("任务复杂度"),
      domain: z.string().describe("任务领域"),
      keyRequirements: z.array(z.string()).describe("关键需求列表"),
    }),
  }
);
