import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getLLM } from "@/lib/llm/client";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const SCORING_PROMPT = `你是一个提示词工程框架评估专家。请从以下四个维度评估用户上传的框架质量，每个维度0-25分，总分0-100分：

1. 结构完整性 (0-25分)
   - 是否包含清晰的框架组成部分说明
   - 每个部分是否有定义和解释

2. 清晰度 (0-25分)
   - 说明是否通俗易懂
   - 术语使用是否一致

3. 实用性 (0-25分)
   - 是否包含实际使用示例
   - 示例是否具有可操作性

4. 原创性 (0-25分)
   - 与常见框架(RACE, CRISPE, Chain of Thought等)的区别度
   - 是否有独特的价值

请严格以JSON格式返回，不要包含其他内容：
{"score": 总分, "details": {"结构完整性": {"score": 分数, "reason": "原因"}, "清晰度": {"score": 分数, "reason": "原因"}, "实用性": {"score": 分数, "reason": "原因"}, "原创性": {"score": 分数, "reason": "原因"}}}`;

export const scoreFrameworkTool = tool(
  async ({ markdownContent, name, description }) => {
    const llm = getLLM();

    const response = await llm.invoke([
      new SystemMessage(SCORING_PROMPT),
      new HumanMessage(`框架名称：${name}\n描述：${description}\n\n框架内容：\n${markdownContent}`),
    ]);

    const content = typeof response.content === "string" ? response.content : String(response.content);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? jsonMatch[0] : content;
    } catch {
      return JSON.stringify({ score: 0, details: { error: { score: 0, reason: "评分解析失败" } } });
    }
  },
  {
    name: "score_framework",
    description: "评估用户上传的框架质量，返回0-100分的评分和各维度详情",
    schema: z.object({
      markdownContent: z.string().describe("框架的markdown内容"),
      name: z.string().describe("框架名称"),
      description: z.string().describe("框架描述"),
    }),
  }
);
