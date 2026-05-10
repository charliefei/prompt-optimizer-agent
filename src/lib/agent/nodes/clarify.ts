import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { CLARIFY_SYSTEM_PROMPT } from "../prompts/clarify";
import type { Analysis } from "../state";

export async function clarifyNode(state: {
  messages: { content: string | unknown }[];
  analysis: Analysis | null;
  clarificationRound: number;
  collectedInfo: Record<string, string>;
  writer?: (data: unknown) => void;
}) {
  const llm = getLLM();

  // If this is the first round and no ambiguities, skip clarification
  if (state.clarificationRound === 0 && state.analysis && state.analysis.ambiguities.length === 0) {
    return {
      clarificationComplete: true,
      phase: "generate",
    };
  }

  const collectedInfoStr = Object.entries(state.collectedInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const userMessage = state.messages[state.messages.length - 1];
  const userContent = typeof userMessage.content === "string" ? userMessage.content : String(userMessage.content);

  const response = await llm.invoke([
    new SystemMessage(CLARIFY_SYSTEM_PROMPT),
    new HumanMessage(
      `## 用户原始需求\n\n${userContent}\n\n## 分析结果\n\n${JSON.stringify(state.analysis, null, 2)}\n\n## 已收集的信息\n\n${collectedInfoStr || "暂无"}\n\n## 澄清轮次\n\n第 ${state.clarificationRound + 1} 轮\n\n请判断是否需要继续澄清。`
    ),
  ]);

  const content = typeof response.content === "string" ? response.content : String(response.content);

  let parsed: { complete: boolean; questions: string[]; newInfo: Record<string, string> };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    // If parsing fails, assume clarification is complete
    parsed = { complete: true, questions: [], newInfo: {} };
  }

  if (parsed.complete) {
    return {
      clarificationComplete: true,
      collectedInfo: { ...state.collectedInfo, ...parsed.newInfo },
      phase: "generate",
    };
  }

  // Send clarification questions to user
  state.writer?.({
    type: "clarification",
    content: "我需要了解更多信息：",
    questions: parsed.questions,
  });

  return {
    clarificationRound: state.clarificationRound + 1,
    collectedInfo: { ...state.collectedInfo, ...parsed.newInfo },
    phase: "clarify",
  };
}
