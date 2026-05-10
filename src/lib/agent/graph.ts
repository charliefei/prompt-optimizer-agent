import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state";
import { analyzeNode } from "./nodes/analyze";
import { matchFrameworkNode } from "./nodes/match-framework";
import { clarifyNode } from "./nodes/clarify";
import { generateNode } from "./nodes/generate";
import { presentNode } from "./nodes/present";

function afterClarify(state: typeof AgentState.State): string {
  if (state.clarificationComplete) {
    return "generate";
  }
  return END;
}

function afterGenerate(state: typeof AgentState.State): string {
  return "present";
}

const workflow = new StateGraph(AgentState)
  .addNode("analyze", analyzeNode)
  .addNode("matchFramework", matchFrameworkNode)
  .addNode("loadFramework", async (state) => {
    // Load framework detail is handled in generate node
    return { phase: "clarify" };
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
