import { NextRequest, NextResponse } from "next/server";
import { getIssueWithCovers, getRecentWindow } from "@/lib/service";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const windowParam = request.nextUrl.searchParams.get("window");

  if (date) {
    const issue = await getIssueWithCovers(date);
    if (!issue) {
      return NextResponse.json({ issue: null, error: "Issue not found" }, { status: 404 });
    }
    return NextResponse.json({ issue });
  }

  const limit = Number(windowParam ?? 7);
  const issues = await getRecentWindow(Number.isFinite(limit) ? limit : 7);

  return NextResponse.json({ issues });
}
