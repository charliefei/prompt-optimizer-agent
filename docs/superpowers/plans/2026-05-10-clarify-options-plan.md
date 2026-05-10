# Clarify Node Options Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the clarify node so each question includes 2-3 LLM-generated options as clickable buttons, plus a custom text input — one question per round.

**Architecture:** Single-question-per-round within the existing clarify → pause → resume loop. LLM prompt updated to output `{ complete, question, options[], newInfo }`. Dimension-based fallback presets cover parse failures. Frontend renders a clarification card with option buttons and inline custom input.

**Tech Stack:** Next.js 15, LangGraph, TypeScript, Tailwind CSS

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/chat.ts` | Add `question?`, `options?` to stream event and message types |
| `src/lib/agent/state.ts` | Add `lastQuestion`, `lastOptions` to AgentState |
| `src/lib/agent/prompts/fallback-options.ts` | **New** — Dimension→preset-options map + `getFallbackOptions()` helper |
| `src/lib/agent/prompts/clarify.ts` | Rewrite system prompt for single-question + options output |
| `src/lib/agent/nodes/clarify.ts` | Parse single question + options, fallback, send typed event |
| `src/app/chat/page.tsx` | Rewrite `MessageBubble` clarification branch with options UI |

---

### Task 1: Add `question` and `options` to chat types

**Files:**
- Modify: `src/types/chat.ts`

- [ ] **Step 1: Update ChatStreamEvent and ChatMessage**

Replace the existing `questions?: string[]` field with both old and new fields:

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  type: MessageType;
  content: string;
  framework?: {
    id: number;
    name: string;
    reason: string;
  };
  question?: string;
  options?: string[];
  questions?: string[];
  timestamp: number;
}

export interface ChatStreamEvent {
  type: MessageType;
  content?: string;
  framework?: { id: number; name: string; reason: string };
  question?: string;
  options?: string[];
  questions?: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/chat.ts
git commit -m "feat: add question and options fields to chat types"
```

---

### Task 2: Add state fields for tracking current question

**Files:**
- Modify: `src/lib/agent/state.ts`

- [ ] **Step 1: Add `lastQuestion` and `lastOptions` to AgentState**

In `src/lib/agent/state.ts`, add two new annotations after `clarificationRound`:

```typescript
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  phase: Annotation<string>,
  analysis: Annotation<Analysis | null>,
  selectedFramework: Annotation<FrameworkMatch | null>,
  frameworkDetail: Annotation<string | null>,
  clarificationRound: Annotation<number>,
  clarificationComplete: Annotation<boolean>,
  collectedInfo: Annotation<Record<string, string>>,
  lastQuestion: Annotation<string | null>,
  lastOptions: Annotation<string[] | null>,
  optimizedPrompt: Annotation<string | null>,
  writer: Annotation<((data: unknown) => void) | null>,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/state.ts
git commit -m "feat: add lastQuestion and lastOptions to agent state"
```

---

### Task 3: Create fallback options file

**Files:**
- Create: `src/lib/agent/prompts/fallback-options.ts`

- [ ] **Step 1: Create the file with dimension presets and helper**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/prompts/fallback-options.ts
git commit -m "feat: add dimension-based fallback options for clarify node"
```

---

### Task 4: Update clarify system prompt

**Files:**
- Modify: `src/lib/agent/prompts/clarify.ts`

- [ ] **Step 1: Rewrite the prompt for single-question + options format**

```typescript
export const CLARIFY_SYSTEM_PROMPT = `你是一个专业的提示词需求澄清专家。你的任务是通过提问来收集足够的信息，以便生成高质量的提示词。

你需要检查以下维度的信息是否完整：
1. 目标明确性：用户想要达成什么具体目标？
2. 目标受众：提示词的输出面向谁？
3. 上下文：有什么背景信息或约束条件？
4. 格式要求：期望的输出格式是什么？
5. 风格和语气：正式/非正式、技术性/通俗等
6. 具体示例：是否有参考示例或期望的输出样例？

规则：
- 每次只问1个最关键的问题，选择信息缺口最大的维度提问
- 为每个问题生成2-3个具体、有区分度的推荐选项，覆盖不同方向
- 问题要具体、明确，避免笼统
- 如果信息已经足够，返回 complete: true
- 用中文提问

返回格式：
如果需要继续澄清：
{
  "complete": false,
  "question": "你希望输出什么格式？",
  "options": ["纯文本段落", "Markdown格式", "结构化JSON"],
  "newInfo": {}
}

如果信息已足够：
{
  "complete": true,
  "question": "",
  "options": [],
  "newInfo": {"format": "markdown", "audience": "技术团队"}
}`;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/prompts/clarify.ts
git commit -m "feat: update clarify prompt for single-question with options"
```

---

### Task 5: Update clarify node logic

**Files:**
- Modify: `src/lib/agent/nodes/clarify.ts`

- [ ] **Step 1: Rewrite the clarify node**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/nodes/clarify.ts
git commit -m "feat: clarify node generates options with dimension fallback"
```

---

### Task 6: Update frontend clarification UI

**Files:**
- Modify: `src/app/chat/page.tsx`

- [ ] **Step 1: Replace the clarification branch in MessageBubble**

Find the current clarification block (lines 112-135) and replace with the new rendering that shows a single question with clickable option buttons and a custom text input. Add a `ClarificationCard` sub-component.

Add this component above `MessageBubble`:

```typescript
function ClarificationCard({
  question,
  options,
  onAnswer,
  disabled,
}: {
  question: string;
  options: string[];
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [customInput, setCustomInput] = useState("");
  const [answered, setAnswered] = useState(false);

  const handleOptionClick = (option: string) => {
    if (answered || disabled) return;
    setAnswered(true);
    onAnswer(option);
  };

  const handleCustomSend = () => {
    const text = customInput.trim();
    if (!text || answered || disabled) return;
    setAnswered(true);
    onAnswer(text);
  };

  return (
    <div className="flex justify-start animate-fade-in-up">
      <Card className="max-w-[85%] shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChevronDown className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">需要补充一些信息</p>
          </div>
          <p className="text-sm font-medium mb-3 leading-relaxed">{question}</p>

          {!answered && (
            <>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      disabled={disabled}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                        bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20
                        transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="或输入自定义回答..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCustomSend();
                      }
                    }}
                    rows={1}
                    className="min-h-[38px] max-h-24 resize-none rounded-lg pr-3 border-border/60 bg-muted/50 text-sm"
                    disabled={disabled}
                  />
                </div>
                {customInput.trim() && (
                  <Button
                    onClick={handleCustomSend}
                    disabled={disabled}
                    size="sm"
                    className="h-[38px] shrink-0 rounded-lg"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}

          {answered && (
            <p className="text-xs text-muted-foreground mt-1">已收到回答 ✓</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

Then replace the existing clarification block in `MessageBubble` (the `if (message.type === "clarification" && message.questions)` block) with:

```typescript
if (message.type === "clarification" && message.question) {
  return (
    <ClarificationCard
      question={message.question}
      options={message.options || []}
      onAnswer={(answer) => sendMessage(answer)}
      disabled={isStreaming}
    />
  );
}

// Keep backward compat: old multi-question format
if (message.type === "clarification" && message.questions) {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <Card className="max-w-[85%] shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChevronDown className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">需要补充一些信息</p>
          </div>
          <ol className="space-y-2.5">
            {message.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-px">{q}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
```

Note: `ClarificationCard` needs `sendMessage` from the parent. Pass it as a prop to `MessageBubble`, or lift the handler up. Since `MessageBubble` currently receives only `message`, add `onClarifyAnswer?: (answer: string) => void` as a prop.

Update `MessageBubble` signature:

```typescript
function MessageBubble({
  message,
  onClarifyAnswer,
}: {
  message: ChatMessage;
  onClarifyAnswer?: (answer: string) => void;
}) {
```

And in the parent, when mapping messages, pass the handler:

```typescript
{hasMessages ? (
  <ScrollArea className="flex-1">
    <div className="space-y-5 max-w-3xl mx-auto px-4 py-6">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onClarifyAnswer={(answer) => sendMessage(answer)}
        />
      ))}
      {isStreaming && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  </ScrollArea>
) : (
```

- [ ] **Step 2: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat: add clarification options UI with clickable buttons and custom input"
```

---

### Task 7: Build verification

**Files:** None

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run dev
```

Manual test flow:
1. Open `http://localhost:3000/chat`
2. Type a vague prompt like "帮我写点东西" and send
3. Verify the clarify node asks ONE question with 2-3 option buttons
4. Click an option — verify it sends and the card shows "已收到回答"
5. Verify the graph resumes and either asks another question or proceeds to generate
6. Start a new conversation, this time type a custom answer in the text field and send
7. Verify custom answer is processed correctly
8. Test with a detailed prompt (e.g. "帮我写一个面向C端消费者的电商产品描述，要求正式风格，Markdown格式") — verify clarify is skipped if LLM deems info sufficient

- [ ] **Step 4: Verify backward compat**

If old messages with `questions` arrays exist in localStorage, verify they still render as the old list format.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```
