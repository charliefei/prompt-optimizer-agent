import { matchFrameworks } from "../tools/match-framework-tool";
import type { Analysis, FrameworkMatch } from "../state";

export async function matchFrameworkNode(state: {
  analysis: Analysis | null;
  selectedFramework: FrameworkMatch | null;
  writer?: (data: unknown) => void;
}) {
  // If user already selected a framework, skip matching
  if (state.selectedFramework) {
    return { phase: "load_framework" };
  }

  if (!state.analysis) {
    return { phase: "clarify" };
  }

  state.writer?.({ type: "text", content: "正在匹配最合适的框架..." });

  const matches = await matchFrameworks(state.analysis);

  if (matches.length === 0) {
    return {
      phase: "clarify",
      selectedFramework: null,
    };
  }

  // Auto-select the best match
  const best = matches[0];

  state.writer?.({
    type: "framework_recommendation",
    content: `为您推荐框架：${best.name}`,
    framework: best,
  });

  return {
    selectedFramework: best,
    phase: "load_framework",
  };
}
