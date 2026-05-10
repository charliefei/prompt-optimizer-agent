import { NextRequest, NextResponse } from "next/server";
import { loadFramework } from "@/lib/frameworks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const frameworkId = parseInt(id);

  if (isNaN(frameworkId) || frameworkId < 1 || frameworkId > 57) {
    return NextResponse.json({ error: "Invalid framework ID" }, { status: 400 });
  }

  const framework = await loadFramework(frameworkId);
  if (!framework) {
    return NextResponse.json({ error: "Framework not found" }, { status: 404 });
  }

  return NextResponse.json(framework);
}
