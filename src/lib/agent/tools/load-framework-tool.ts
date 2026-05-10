import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { loadFramework } from "@/lib/frameworks";

export const loadFrameworkTool = tool(
  async ({ frameworkId }) => {
    const framework = await loadFramework(frameworkId);
    if (!framework) {
      return `未找到 ID 为 ${frameworkId} 的框架`;
    }
    return framework.rawMarkdown;
  },
  {
    name: "load_framework",
    description: "加载指定框架的完整详情（markdown原文）。用于获取框架的详细结构和示例。",
    schema: z.object({
      frameworkId: z.number().describe("框架序号，1-57"),
    }),
  }
);
