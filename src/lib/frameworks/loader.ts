import fs from "fs/promises";
import path from "path";
import type { FrameworkSummary, Framework, FrameworkComponent } from "@/types/framework";

const FRAMEWORKS_DIR = path.join(process.cwd(), "prompt-optimizer", "references", "frameworks");
const SUMMARY_PATH = path.join(process.cwd(), "prompt-optimizer", "references", "Frameworks_Summary.md");

let summariesCache: FrameworkSummary[] | null = null;
const frameworkCache = new Map<number, Framework>();

const COMPLEXITY_MAP: Record<string, "simple" | "medium" | "complex"> = {
  // Simple (3 elements or fewer)
  APE: "simple", ERA: "simple", TAG: "simple", RTF: "simple", BAB: "simple",
  PEE: "simple", ELI5: "simple",
  // Medium (4-5 elements)
  RACE: "medium", CIDI: "medium", SPEAR: "medium", SPAR: "medium", FOCUS: "medium",
  SMART: "medium", GOPA: "medium", ORID: "medium", CARE: "medium", ROSES: "medium",
  PAUSE: "medium", TRACE: "medium", GRADE: "medium", TRACI: "medium", RODES: "medium",
  BLOG: "medium", RICE: "medium", RELIC: "medium", HMW: "medium", RISE: "medium",
  TQA: "medium", RISEN: "medium", COAST: "medium",
  // Complex (6+ elements)
  RACEF: "complex", CRISPE: "complex", SCAMPER: "complex", "Six Thinking Hats": "complex",
  PROMPT: "complex", RASCEF: "complex", "Atomic Prompting": "complex",
  // Others
  "Tree of Thought": "complex", "Chain of Thought": "complex", "Chain of Destiny": "complex",
  "Few-shot": "medium", "Zero-shot": "simple", "Pros and Cons": "medium",
  "3Cs Model": "medium", "4S Method": "medium", "CAR-PAR-STAR": "medium",
  "Challenge-Solution-Benefit": "medium", Elicitation: "medium",
  "Five Ws and One H": "medium", "Hamburger Model": "medium",
  "Help Me Understood": "medium", Imagine: "medium", "Socratic Method": "medium",
  "What If": "medium", SPARK: "medium",
};

const DOMAIN_MAP: Record<string, string[]> = {
  BAB: ["营销内容"], SPEAR: ["营销内容"], "Challenge-Solution-Benefit": ["营销内容"],
  BLOG: ["营销内容", "写作创作"], PROMPT: ["营销内容"], RHODES: ["营销内容", "写作创作"],
  RICE: ["决策分析"], "Pros and Cons": ["决策分析"], "Six Thinking Hats": ["决策分析"],
  "Tree of Thought": ["决策分析", "复杂推理"], PAUSE: ["决策分析"], "What If": ["决策分析"],
  "Bloom's Taxonomy": ["教育培训"], ELI5: ["教育培训"], "Socratic Method": ["教育培训"],
  PEE: ["教育培训"], "Hamburger Model": ["教育培训", "写作创作"],
  SCAMPER: ["产品开发"], HMW: ["产品开发"], CIDI: ["产品开发"], RELIC: ["产品开发"],
  "3Cs Model": ["产品开发"],
  COAST: ["AI对话/助手"], ROSES: ["AI对话/助手"], TRACE: ["AI对话/助手"],
  RACE: ["AI对话/助手"], RASCEF: ["AI对话/助手"],
  "4S Method": ["写作创作"], "Few-shot": ["写作创作"], "Chain of Destiny": ["写作创作"],
  "Atomic Prompting": ["图像生成"],
  "Zero-shot": ["快速简单任务"], ERA: ["快速简单任务"], TAG: ["快速简单任务"],
  APE: ["快速简单任务"], RTF: ["快速简单任务"],
  "Chain of Thought": ["复杂推理"],
};

function parseSummaryTable(content: string): FrameworkSummary[] {
  const lines = content.split("\n");
  const summaries: FrameworkSummary[] = [];

  for (const line of lines) {
    // Match table rows: | number | name | scenarios |
    const match = line.replace(/\r$/, "").match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (match && match[1] !== "序号") {
      const id = parseInt(match[1]);
      const name = match[2].trim();
      const scenarios = match[3].split("、").map((s) => s.trim());
      const paddedId = String(id).padStart(2, "0");
      const nameSlug = name.replace(/\s+/g, "_").replace(/_Framework$/, "");
      const fileName = `${paddedId}_${nameSlug}_Framework.md`;

      summaries.push({
        id,
        name,
        fileName,
        scenarios,
        complexity: COMPLEXITY_MAP[name] || "medium",
        domains: DOMAIN_MAP[name] || [],
      });
    }
  }

  return summaries;
}

function parseFrameworkMarkdown(content: string, summary: FrameworkSummary): Framework {
  const sections: Record<string, string> = {};
  let currentSection = "";
  let currentContent = "";

  for (const line of content.split("\n")) {
    const cleanLine = line.replace(/\r$/, "");
    const h2Match = cleanLine.match(/^## (.+)$/);
    if (h2Match) {
      if (currentSection) {
        sections[currentSection] = currentContent.trim();
      }
      currentSection = h2Match[1].trim();
      currentContent = "";
    } else {
      currentContent += cleanLine + "\n";
    }
  }
  if (currentSection) {
    sections[currentSection] = currentContent.trim();
  }

  // Parse source URL
  const sourceUrl = sections["网址"]?.match(/\[(.+?)\]\((.+?)\)/)?.[2] || "";

  // Parse overview
  const overview = sections["概述"] || "";

  // Parse components from table
  const components: FrameworkComponent[] = [];
  const tableContent = sections["框架构成"] || "";
  for (const line of tableContent.split("\n")) {
    const cellMatch = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (cellMatch && !cellMatch[1].includes("---") && cellMatch[1].trim() !== "组成部分") {
      components.push({
        name: cellMatch[1].trim(),
        englishName: cellMatch[2].trim(),
        description: cellMatch[3].trim(),
      });
    }
  }

  // Parse detailed explanations
  const detailedExplanations: { title: string; content: string }[] = [];
  const detailSection = sections["详细说明"] || "";
  let detailTitle = "";
  let detailContent = "";
  for (const line of detailSection.split("\n")) {
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      if (detailTitle) {
        detailedExplanations.push({ title: detailTitle, content: detailContent.trim() });
      }
      detailTitle = h3Match[1].trim();
      detailContent = "";
    } else {
      detailContent += line + "\n";
    }
  }
  if (detailTitle) {
    detailedExplanations.push({ title: detailTitle, content: detailContent.trim() });
  }

  // Parse pros/cons
  const parseBulletList = (text: string): string[] => {
    return text
      .split("\n")
      .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"))
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  };

  const pros = parseBulletList(sections["优点"] || "");
  const cons = parseBulletList(sections["缺点"] || "");

  // Parse examples
  const examples: { title: string; content: string }[] = [];
  const exampleSection = sections["最佳实践"] || "";
  let exTitle = "";
  let exContent = "";
  for (const line of exampleSection.split("\n")) {
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      if (exTitle) {
        examples.push({ title: exTitle, content: exContent.trim() });
      }
      exTitle = h3Match[1].trim();
      exContent = "";
    } else {
      exContent += line + "\n";
    }
  }
  if (exTitle) {
    examples.push({ title: exTitle, content: exContent.trim() });
  }

  return {
    ...summary,
    sourceUrl,
    overview,
    components,
    detailedExplanations,
    pros,
    cons,
    examples,
    rawMarkdown: content,
  };
}

export async function getFrameworkSummaries(): Promise<FrameworkSummary[]> {
  if (summariesCache) return summariesCache;

  const content = await fs.readFile(SUMMARY_PATH, "utf-8");
  summariesCache = parseSummaryTable(content);
  return summariesCache;
}

export async function loadFramework(id: number): Promise<Framework | null> {
  if (frameworkCache.has(id)) return frameworkCache.get(id)!;

  const summaries = await getFrameworkSummaries();
  const summary = summaries.find((s) => s.id === id);
  if (!summary) return null;

  const filePath = path.join(FRAMEWORKS_DIR, summary.fileName);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const framework = parseFrameworkMarkdown(content, summary);
    frameworkCache.set(id, framework);
    return framework;
  } catch {
    return null;
  }
}

export async function searchFrameworks(query?: string, complexity?: string, domain?: string): Promise<FrameworkSummary[]> {
  let frameworks = await getFrameworkSummaries();

  if (query) {
    const q = query.toLowerCase();
    frameworks = frameworks.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.scenarios.some((s) => s.includes(q))
    );
  }

  if (complexity) {
    frameworks = frameworks.filter((f) => f.complexity === complexity);
  }

  if (domain) {
    frameworks = frameworks.filter((f) => f.domains.includes(domain));
  }

  return frameworks;
}
