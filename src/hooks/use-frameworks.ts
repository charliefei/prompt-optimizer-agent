import useSWR from "swr";
import type { FrameworkSummary, Framework } from "@/types/framework";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useFrameworks(search?: string, complexity?: string, domain?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (complexity) params.set("complexity", complexity);
  if (domain) params.set("domain", domain);

  const url = `/api/frameworks${params.toString() ? `?${params.toString()}` : ""}`;
  return useSWR<FrameworkSummary[]>(url, fetcher);
}

export function useFramework(id: number) {
  return useSWR<Framework>(`/api/frameworks/${id}`, fetcher);
}
