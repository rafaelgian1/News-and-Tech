import { NextRequest, NextResponse } from "next/server";
import { getArchiveWindow } from "@/lib/service";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 90);
  const issues = await getArchiveWindow(Number.isFinite(limit) ? limit : 90);
  return NextResponse.json({ issues });
}
