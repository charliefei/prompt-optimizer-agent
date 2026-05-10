import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getLLM } from "@/lib/llm/client";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const GENERATE_SYSTEM_PROMPT = `你是一个专业的提示词工程师。你的任务是根据用户选择的框架结构和收集到的需求信息，生成一个高质量、结构化的提示词。

要求：
1. 严格按照框架的组成部分来组织提示词
2. 将用户的需求信息填充到框架的每个部分中
3. 确保提示词清晰、具体、可执行
4. 如果框架有示例，参考示例的风格和质量
5. 输出的提示词应该可以直接使用

请直接输出优化后的提示词，不要添加额外的解释。`;

export const generatePromptTool = tool(
  async ({ frameworkMarkdown, userRequirements, collectedInfo }) => {
    const llm = getLLM();

    const collectedInfoStr = Object.entries(collectedInfo)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    const response = await llm.invoke([
      new SystemMessage(GENERATE_SYSTEM_PROMPT),
      new HumanMessage(
        `## 选定的框架\n\n${frameworkMarkdown}\n\n## 用户需求\n\n${userRequirements}\n\n## 收集到的补充信息\n\n${collectedInfoStr || "无"}\n\n请根据以上框架结构和需求信息，生成优化后的提示词。`
      ),
    ]);

    return typeof response.content === "string" ? response.content : String(response.content);
  },
  {
    name: "generate_prompt",
    description: "根据选定框架和用户需求，生成优化后的提示词",
    schema: z.object({
      frameworkMarkdown: z.string().describe("框架的完整markdown内容"),
      userRequirements: z.string().describe("用户的原始需求描述"),
      collectedInfo: z.record(z.string()).describe("通过澄清收集到的补充信息"),
    }),
  }
);
