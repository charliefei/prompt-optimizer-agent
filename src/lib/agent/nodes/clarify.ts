import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { CLARIFY_SYSTEM_PROMPT } from "../prompts/clarify";
import { getFallbackOptions } from "../prompts/fallback-options";
import type { Analysis } from "../state";

export async function clarifyNode(state: {
  messages: { content: string | unknown }[];
  analysis: Analysis | null;
  clarificationRound: number;
  collectedInfo: Record<string, string>;
  writer?: (data: unknown) => void;
}) {
  const llm = getLLM();

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
      `## 用户原始需求\n\n${userContent}\n\n## 分析结果\n\n${JSON.stringify(state.analysis, null, 2)}\n\n## 已收集的信息\n\n${collectedInfoStr || "暂无"}\n\n## 澄清轮次\n\n第 ${state.clarificationRound + 1} 轮\n\n请判断是否需要继续澄清。如果需要，只问1个最关键的问题，并给出2-3个推荐选项。`
    ),
  ]);

  const content = typeof response.content === "string" ? response.content : String(response.content);

  let parsed: {
    complete: boolean;
    question: string;
    options: string[];
    newInfo: Record<string, string>;
  };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const raw = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    parsed = {
      complete: raw.complete ?? true,
      question: raw.question || "",
      options: Array.isArray(raw.options) ? raw.options : [],
      newInfo: raw.newInfo || {},
    };
  } catch {
    parsed = { complete: true, question: "", options: [], newInfo: {} };
  }

  if (parsed.complete) {
    return {
      clarificationComplete: true,
      collectedInfo: { ...state.collectedInfo, ...parsed.newInfo },
      phase: "generate",
    };
  }

  // Fallback: if options are empty, use dimension presets
  let options = parsed.options;
  if (options.length === 0 && state.analysis) {
    for (const ambiguity of state.analysis.ambiguities) {
      const fallback = getFallbackOptions(ambiguity);
      if (fallback.length > 0) {
        options = fallback;
        break;
      }
    }
  }

  // Send single clarification question with options
  state.writer?.({
    type: "clarification",
    question: parsed.question,
    options,
  });

  return {
    clarificationRound: state.clarificationRound + 1,
    collectedInfo: { ...state.collectedInfo, ...parsed.newInfo },
    lastQuestion: parsed.question,
    lastOptions: options,
    phase: "clarify",
  };
}
