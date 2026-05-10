import { NextRequest, NextResponse } from "next/server";
import { saveUserFramework } from "@/lib/frameworks/user-store";
import { getLLM } from "@/lib/llm/client";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const markdown = formData.get("markdown") as string;
    const name = formData.get("name") as string || "未命名框架";
    const description = formData.get("description") as string || "";
    const scenariosStr = formData.get("scenarios") as string || "";
    const threshold = parseInt(formData.get("threshold") as string) || 60;

    if (!markdown?.trim()) {
      return NextResponse.json({ error: "请提供框架内容" }, { status: 400 });
    }

    const scenarios = scenariosStr
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Call LLM to score
    const llm = getLLM();
    const response = await llm.invoke([
      new SystemMessage(SCORING_PROMPT),
      new HumanMessage(`框架名称：${name}\n描述：${description}\n\n框架内容：\n${markdown}`),
    ]);

    let score: number;
    let scoreDetails: Record<string, { score: number; reason: string }>;

    try {
      const content = typeof response.content === "string" ? response.content : String(response.content);
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      score = parsed.score;
      scoreDetails = parsed.details;
    } catch {
      score = 0;
      scoreDetails = { error: { score: 0, reason: "评分解析失败" } };
    }

    if (score >= threshold) {
      const framework = await saveUserFramework({
        name,
        description,
        scenarios,
        rawMarkdown: markdown,
        score,
        scoreDetails,
      });

      return NextResponse.json({
        success: true,
        framework,
        score,
        scoreDetails,
      });
    } else {
      return NextResponse.json({
        success: false,
        score,
        scoreDetails,
        rejected: true,
        rejectionReason: `分数 ${score} 低于阈值 ${threshold}`,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "上传处理失败" }, { status: 500 });
  }
}
