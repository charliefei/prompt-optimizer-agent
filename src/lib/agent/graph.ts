import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state";
import { analyzeNode } from "./nodes/analyze";
import { matchFrameworkNode } from "./nodes/match-framework";
import { clarifyNode } from "./nodes/clarify";
import { generateNode } from "./nodes/generate";
import { presentNode } from "./nodes/present";
import { loadFramework } from "@/lib/frameworks";
import { log, logState } from "./logging";

function afterClarify(state: typeof AgentState.State): string {
  const route = state.clarificationComplete ? "generate" : END;
  log("routing", `afterClarify: clarificationComplete=${state.clarificationComplete} → ${route}`);
  return route;
}

function afterGenerate(state: typeof AgentState.State): string {
  log("routing", "afterGenerate → present");
  return "present";
}

const workflow = new StateGraph(AgentState)
  .addNode("analyze", analyzeNode)
  .addNode("matchFramework", matchFrameworkNode)
  .addNode("loadFramework", async (state) => {
    logState("loadFramework", {
      hasSelectedFramework: state.selectedFramework !== null,
      frameworkId: state.selectedFramework?.id,
      frameworkName: state.selectedFramework?.name || null,
    });

    if (!state.selectedFramework) {
      log("loadFramework", "No selectedFramework → clarify");
      return { phase: "clarify" };
    }

    state.writer?.({ type: "text", content: "正在加载框架详情..." });
    log("loadFramework", `Loading framework id=${state.selectedFramework.id}...`);

    const framework = await loadFramework(state.selectedFramework.id);
    const frameworkMarkdown = framework?.rawMarkdown || "";

    if (frameworkMarkdown) {
      log("loadFramework", `Loaded "${framework?.name}" (${frameworkMarkdown.length} chars) → clarify`);
    } else {
      log("loadFramework", `Load FAILED for id=${state.selectedFramework.id} → clarify`);
    }

    return {
      frameworkDetail: frameworkMarkdown,
      phase: "clarify",
    };
  })
  .addNode("clarify", clarifyNode)
  .addNode("generate", generateNode)
  .addNode("present", presentNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", "matchFramework")
  .addEdge("matchFramework", "loadFramework")
  .addEdge("loadFramework", "clarify")
  .addConditionalEdges("clarify", afterClarify, ["generate", END])
  .addEdge("generate", "present")
  .addEdge("present", END);

const memory = new MemorySaver();

export const agentGraph = workflow.compile({
  checkpointer: memory,
});
