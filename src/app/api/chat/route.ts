import { NextRequest } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { agentGraph } from "@/lib/agent/graph";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { message, threadId, frameworkId } = await request.json();

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "消息不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tid = threadId || randomUUID();
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
          phase: "analyze",
          clarificationRound: 0,
          clarificationComplete: false,
          collectedInfo: {},
          optimizedPrompt: null,
          writer,
        };

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
