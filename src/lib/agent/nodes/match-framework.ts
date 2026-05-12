import { matchFrameworks } from "../tools/match-framework-tool";
import { log, logState } from "../logging";
import type { Analysis, FrameworkMatch } from "../state";
import { getWriter, type AgentRunnableConfig } from "../runtime";

export async function matchFrameworkNode(state: {
  analysis: Analysis | null;
  selectedFramework: FrameworkMatch | null;
}, config?: AgentRunnableConfig) {
  const writer = getWriter(config);

  logState("matchFramework", {
    hasAnalysis: state.analysis !== null,
    hasPreselected: state.selectedFramework !== null,
    preselectedName: state.selectedFramework?.name || null,
  });

  // If user already selected a framework, skip matching
  if (state.selectedFramework) {
    log("matchFramework", `User preselected framework "${state.selectedFramework.name}" → load_framework`);
    return { phase: "load_framework" };
  }

  if (!state.analysis) {
    log("matchFramework", "No analysis available → clarify");
    return { phase: "clarify" };
  }

  writer?.({ type: "text", content: "正在匹配最合适的框架..." });

  const matches = await matchFrameworks(state.analysis);

  if (matches.length === 0) {
    log("matchFramework", "No frameworks matched → clarify");
    return {
      phase: "clarify",
      selectedFramework: null,
    };
  }

  // Auto-select the best match
  const best = matches[0];
  const top3 = matches.slice(0, 3).map((m) => `${m.name}(${m.reason})`).join(", ");
  log("matchFramework", `Top matches: [${top3}]`);

  writer?.({
    type: "framework_recommendation",
    content: `为您推荐框架：${best.name}`,
    framework: best,
  });

  log("matchFramework", `Selected "${best.name}" (id=${best.id}) → load_framework`);
  return {
    selectedFramework: best,
    phase: "load_framework",
  };
}
