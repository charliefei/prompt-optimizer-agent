const FALLBACK_OPTIONS: Record<string, string[]> = {
  "目标明确性": ["具体可衡量的业务指标", "定性的用户感受", "流程/效率提升"],
  "目标受众": ["C端普通用户", "技术专业人士", "管理层/决策者"],
  "上下文": ["已有完整背景资料", "需要AI自行假设", "提供简要上下文"],
  "格式要求": ["纯文本段落", "Markdown格式", "结构化JSON", "分点列表"],
  "风格和语气": ["正式专业", "轻松友好", "技术性", "通俗易懂"],
  "具体示例": ["提供参考样例", "不需要样例", "AI自行发挥"],
};

const GENERIC_OPTIONS = ["确认，按此方向继续", "需要调整方向", "以上都不对，我补充说明"];

export function getFallbackOptions(ambiguity: string): string[] {
  for (const [key, options] of Object.entries(FALLBACK_OPTIONS)) {
    if (ambiguity.includes(key)) {
      return options;
    }
  }
  return GENERIC_OPTIONS;
}
