import type { ChatStreamEvent, ChatDoneEvent } from "@/types/chat";

export function createSSEStream() {
  const encoder = new TextEncoder();

  function encode(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function messageEvent(data: ChatStreamEvent): Uint8Array {
    return encode("message", data);
  }

  function doneEvent(data: ChatDoneEvent): Uint8Array {
    return encode("done", data);
  }

  return { encode, messageEvent, doneEvent };
}
