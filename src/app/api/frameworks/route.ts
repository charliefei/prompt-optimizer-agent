import { NextRequest, NextResponse } from "next/server";
import { searchFrameworks } from "@/lib/frameworks";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const complexity = searchParams.get("complexity") || undefined;
  const domain = searchParams.get("domain") || undefined;

  const frameworks = await searchFrameworks(search, complexity, domain);
  return NextResponse.json(frameworks);
}
