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
  clarificationHistory?: Array<{question: string; answer: string}>;
  lastQuestion?: string | null;
  writer?: (data: unknown) => void;
}) {
  const llm = getLLM();

  if (state.clarificationRound === 0 && state.analysis && state.analysis.ambiguities.length === 0) {
    return {
      clarificationComplete: true,
      phase: "generate",
    };
  }

  const safeCollectedInfo = state.collectedInfo || {};
  const collectedInfoStr = Object.entries(safeCollectedInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  // Record the Q&A pair from the previous round before building the prompt.
  // Only return the NEW pair (single-element array) — the reducer concatenates,
  // so returning the full history would duplicate entries on every round.
  let qaHistory = state.clarificationHistory || [];
  let newQAPair: Array<{question: string; answer: string}> = [];
  if (state.clarificationRound > 0 && state.lastQuestion) {
    const raw = state.messages[state.messages.length - 1].content;
    const answerContent = typeof raw === "string" ? raw : String(raw);
    const pair = { question: state.lastQuestion, answer: answerContent };
    qaHistory = [...qaHistory, pair];
    newQAPair = [pair];
  }

  // Use the original request (first message), not the last clarification answer
  const originalRequest = typeof state.messages[0].content === "string"
    ? state.messages[0].content
    : String(state.messages[0].content);

  const qaHistoryStr = qaHistory.length > 0
    ? qaHistory.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")
    : "暂无";

  const response = await llm.invoke([
    new SystemMessage(CLARIFY_SYSTEM_PROMPT),
    new HumanMessage(
      `## 用户原始需求\n\n${originalRequest}\n\n## 分析结果\n\n${JSON.stringify(state.analysis, null, 2)}\n\n## 已收集的信息\n\n${collectedInfoStr || "暂无"}\n\n## 历史问答\n\n${qaHistoryStr}\n\n## 澄清轮次\n\n第 ${state.clarificationRound + 1} 轮\n\n请判断是否需要继续澄清。如果需要，只问1个最关键的问题，并给出2-3个推荐选项。`
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
    // Parse failure: use a generic question with fallback options
    const fallbackOpts = state.analysis
      ? getFallbackOptions(state.analysis.ambiguities[0] || "")
      : ["确认，按此方向继续", "需要调整方向", "以上都不对，我补充说明"];
    parsed = {
      complete: false,
      question: "请补充更多上下文信息以帮助我更好地理解你的需求",
      options: fallbackOpts,
      newInfo: {},
    };
  }

  if (parsed.complete) {
    return {
      clarificationComplete: true,
      collectedInfo: { ...safeCollectedInfo, ...parsed.newInfo },
      clarificationHistory: newQAPair,
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

  // Guard: if question is empty but we have options, synthesize a question
  let question = parsed.question;
  if (!question && options.length > 0) {
    const firstAmbiguity = state.analysis?.ambiguities[0] || "需求";
    question = `关于「${firstAmbiguity}」，请选择一个方向`;
  }
  // If still no question and no options, skip to generate
  if (!question) {
    return {
      clarificationComplete: true,
      collectedInfo: { ...safeCollectedInfo, ...parsed.newInfo },
      clarificationHistory: newQAPair,
      phase: "generate",
    };
  }

  // Send single clarification question with options
  state.writer?.({
    type: "clarification",
    question,
    options,
  });

  return {
    clarificationRound: state.clarificationRound + 1,
    collectedInfo: { ...safeCollectedInfo, ...parsed.newInfo },
    clarificationHistory: newQAPair,
    lastQuestion: question,
    lastOptions: options,
    phase: "clarify",
  };
}
