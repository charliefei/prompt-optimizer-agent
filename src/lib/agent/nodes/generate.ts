import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { loadFramework } from "@/lib/frameworks";
import { GENERATE_SYSTEM_PROMPT } from "../prompts/generate";
import type { Analysis, FrameworkMatch } from "../state";

export async function generateNode(state: {
  messages: { content: string | unknown }[];
  analysis: Analysis | null;
  selectedFramework: FrameworkMatch | null;
  frameworkDetail: string | null;
  collectedInfo: Record<string, string>;
  writer?: (data: unknown) => void;
}) {
  const llm = getLLM();

  state.writer?.({ type: "text", content: "正在生成优化后的提示词..." });

  // Load framework detail if not already loaded
  let frameworkMarkdown = state.frameworkDetail;
  if (!frameworkMarkdown && state.selectedFramework) {
    const framework = await loadFramework(state.selectedFramework.id);
    frameworkMarkdown = framework?.rawMarkdown || "";
  }

  if (!frameworkMarkdown) {
    return {
      optimizedPrompt: "无法加载框架详情，请重试。",
      phase: "present",
    };
  }

  // Use the original user request (first message), not the last clarification answer
  const originalRequest = typeof state.messages[0].content === "string"
    ? state.messages[0].content
    : String(state.messages[0].content);

  const collectedInfoStr = Object.entries(state.collectedInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const response = await llm.invoke([
    new SystemMessage(GENERATE_SYSTEM_PROMPT),
    new HumanMessage(
      `## 选定的框架：${state.selectedFramework?.name || "未知"}\n\n${frameworkMarkdown}\n\n## 用户需求\n\n${originalRequest}\n\n## 收集到的补充信息\n\n${collectedInfoStr || "无"}\n\n请根据以上框架结构和需求信息，生成优化后的提示词。`
    ),
  ]);

  const optimizedPrompt = typeof response.content === "string" ? response.content : String(response.content);

  state.writer?.({
    type: "prompt_preview",
    content: optimizedPrompt,
  });

  return {
    optimizedPrompt,
    phase: "present",
  };
}
