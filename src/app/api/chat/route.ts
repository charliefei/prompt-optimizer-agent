import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { agentGraph } from "@/lib/agent/graph";
import { randomUUID } from "crypto";

type ThreadRun = {
  runId: string;
  awaitingClarification: boolean;
};

// Browser chat threads can contain multiple optimization tasks. LangGraph
// checkpoints are scoped to one optimization run, so only reuse a run while it
// is waiting for the user's clarification answer.
const threadRuns = new Map<string, ThreadRun>();

const createInitialState = (message: string, frameworkId?: number) => {
  const input: Record<string, unknown> = {
    messages: [new HumanMessage(message)],
    phase: "analyze",
    analysis: null,
    selectedFramework: null,
    frameworkDetail: null,
    clarificationRound: 0,
    clarificationComplete: false,
    collectedInfo: {},
    clarificationHistory: [],
    lastQuestion: null,
    lastOptions: null,
    optimizedPrompt: null,
  };

  if (frameworkId) {
    input.selectedFramework = { id: frameworkId, name: "", reason: "用户预选" };
  }

  return input;
};

export async function POST(request: NextRequest) {
  const { message, threadId, frameworkId } = await request.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "消息不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tid = threadId || randomUUID();
  const existingRun = threadRuns.get(tid);
  const shouldResume = Boolean(existingRun?.awaitingClarification);
  const runId = shouldResume ? existingRun!.runId : randomUUID();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const writer = (data: unknown) => {
        const encoded = encoder.encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
        controller.enqueue(encoded);
      };

      try {
        const input: Record<string, unknown> = shouldResume
          ? { messages: [new HumanMessage(message)] }
          : createInitialState(message, frameworkId ? Number(frameworkId) : undefined);

        const config = {
          configurable: {
            thread_id: runId,
            agentWriter: writer,
          },
        };

        // Run the graph
        const result = await agentGraph.invoke(input, config);
        const awaitingClarification =
          result.phase === "clarify" && result.clarificationComplete === false;

        if (awaitingClarification) {
          threadRuns.set(tid, { runId, awaitingClarification: true });
        } else {
          threadRuns.delete(tid);
        }

        // Send done event
        const doneData = encoder.encode(
          `event: done\ndata: ${JSON.stringify({ threadId: tid, phase: result.phase || "done" })}\n\n`
        );
        controller.enqueue(doneData);
      } catch (error) {
        console.error("Chat error:", error);
        const errorData = encoder.encode(
          `event: message\ndata: ${JSON.stringify({ type: "error", content: "处理请求时发生错误，请重试。" })}\n\n`
        );
        controller.enqueue(errorData);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
