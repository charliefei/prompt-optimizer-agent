import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { ANALYZE_SYSTEM_PROMPT } from "../prompts/analyze";
import type { Analysis } from "../state";

export async function analyzeNode(state: { messages: { content: string }[]; writer?: (data: unknown) => void }) {
  const llm = getLLM();
  const userMessage = state.messages[state.messages.length - 1];

  state.writer?.({ type: "text", content: "正在分析您的需求..." });

  const response = await llm.invoke([
    new SystemMessage(ANALYZE_SYSTEM_PROMPT),
    new HumanMessage(typeof userMessage.content === "string" ? userMessage.content : String(userMessage.content)),
  ]);

  const content = typeof response.content === "string" ? response.content : String(response.content);

  let analysis: Analysis;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    analysis = {
      taskType: "通用",
      complexity: "medium",
      domain: "快速简单任务",
      keyRequirements: [typeof userMessage.content === "string" ? userMessage.content : String(userMessage.content)],
      ambiguities: [],
    };
  }

  return {
    analysis,
    phase: "match_framework",
  };
}
