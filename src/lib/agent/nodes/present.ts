import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { PRESENT_SYSTEM_PROMPT } from "../prompts/present";
import type { FrameworkMatch } from "../state";

export async function presentNode(state: {
  selectedFramework: FrameworkMatch | null;
  optimizedPrompt: string | null;
  collectedInfo: Record<string, string>;
  writer?: (data: unknown) => void;
}) {
  const llm = getLLM();

  if (!state.optimizedPrompt) {
    state.writer?.({
      type: "text",
      content: "未能生成提示词，请重新描述您的需求。",
    });
    return { phase: "done" };
  }

  const collectedInfoStr = Object.entries(state.collectedInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const response = await llm.invoke([
    new SystemMessage(PRESENT_SYSTEM_PROMPT),
    new HumanMessage(
      `## 使用的框架\n\n${state.selectedFramework?.name || "未知"}\n\n## 优化后的提示词\n\n${state.optimizedPrompt}\n\n## 收集到的信息\n\n${collectedInfoStr || "无"}\n\n请向用户展示结果并给出使用建议。`
    ),
  ]);

  const presentation = typeof response.content === "string" ? response.content : String(response.content);

  state.writer?.({
    type: "text",
    content: presentation,
  });

  return { phase: "done" };
}
