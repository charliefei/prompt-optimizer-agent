import { ChatOpenAI } from "@langchain/openai";

let client: ChatOpenAI | null = null;

export function getLLM(): ChatOpenAI {
  if (!client) {
    client = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}
