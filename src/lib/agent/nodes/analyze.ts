import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { ANALYZE_SYSTEM_PROMPT } from "../prompts/analyze";
import { log, logLLMInput, logLLMOutput, logState, logError, truncate } from "../logging";
import type { Analysis } from "../state";
import { getWriter, type AgentRunnableConfig } from "../runtime";

export async function analyzeNode(state: {
  messages: { content: string }[];
  analysis: Analysis | null;
  clarificationRound: number;
}, config?: AgentRunnableConfig) {
  const writer = getWriter(config);

  logState("analyze", {
    phase: "analyze",
    clarificationRound: state.clarificationRound,
    hasAnalysis: state.analysis !== null,
    messageCount: state.messages.length,
  });

  // Skip re-analysis in clarification continuation rounds to avoid
  // regenerating garbage analysis from the short user answer.
  if (state.clarificationRound > 0 && state.analysis) {
    log("analyze", "Skipping re-analysis (round > 0 and analysis exists) → match_framework");
    return { phase: "match_framework" };
  }

  const llm = getLLM();
  const userMessage = state.messages[state.messages.length - 1];
  const userContent = typeof userMessage.content === "string" ? userMessage.content : String(userMessage.content);

  writer?.({ type: "text", content: "正在分析您的需求..." });

  logLLMInput("analyze", ANALYZE_SYSTEM_PROMPT, userContent);

  const response = await llm.invoke([
    new SystemMessage(ANALYZE_SYSTEM_PROMPT),
    new HumanMessage(userContent),
  ]);

  const content = typeof response.content === "string" ? response.content : String(response.content);
  logLLMOutput("analyze", content);

  let analysis: Analysis;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    log("analyze", `Parsed OK: taskType="${analysis.taskType}", complexity=${analysis.complexity}, domain="${analysis.domain}", requirements=${analysis.keyRequirements.length}, ambiguities=${analysis.ambiguities.length}`);
  } catch {
    logError("analyze", "Parse failed, using fallback analysis");
    analysis = {
      taskType: "通用",
      complexity: "medium",
      domain: "快速简单任务",
      keyRequirements: [userContent],
      ambiguities: [],
    };
  }

  log("analyze", `Exiting → phase: match_framework | ambiguities: [${analysis.ambiguities.map((a) => truncate(a)).join(", ")}]`);
  return {
    analysis,
    phase: "match_framework",
  };
}
