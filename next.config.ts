import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@langchain/langgraph", "@langchain/openai", "@langchain/core"],
};

export default nextConfig;
