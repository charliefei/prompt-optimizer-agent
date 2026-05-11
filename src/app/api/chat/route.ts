import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { agentGraph } from "@/lib/agent/graph";
import { randomUUID } from "crypto";

// Track which threads have been initialized. On the first request for a given
// threadId we seed all required state fields; on continuation requests the
// checkpoint already holds the correct values.
const initializedThreads = new Set<string>();

export async function POST(request: NextRequest) {
  const { message, threadId, frameworkId } = await request.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "消息不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tid = threadId || randomUUID();
  const isNew = !initializedThreads.has(tid);
  if (isNew) initializedThreads.add(tid);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const writer = (data: unknown) => {
        const encoded = encoder.encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
        controller.enqueue(encoded);
      };

      try {
        const input: Record<string, unknown> = {
          messages: [new HumanMessage(message)],
          writer,
        };

        // Seed initialization values for a brand-new thread.
        // On continuation, the checkpoint holds the correct values.
        if (isNew) {
          input.phase = "analyze";
          input.clarificationRound = 0;
          input.clarificationComplete = false;
          input.collectedInfo = {};
          input.clarificationHistory = [];
          input.optimizedPrompt = null;
        }

        if (frameworkId) {
          input.selectedFramework = { id: frameworkId, name: "", reason: "用户预选" };
        }

        const config = {
          configurable: { thread_id: tid },
        };

        // Run the graph
        await agentGraph.invoke(input, config);

        // Send done event
        const doneData = encoder.encode(
          `event: done\ndata: ${JSON.stringify({ threadId: tid, phase: "done" })}\n\n`
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
