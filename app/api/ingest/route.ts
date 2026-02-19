import { NextRequest, NextResponse } from "next/server";
import { loadAutomationFeed } from "@/lib/automationFeed";
import { ingestDailyIssue } from "@/lib/service";
import { IngestPayload } from "@/lib/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return true;
  }

  const headerToken = request.headers.get("x-cron-secret");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const queryToken = request.nextUrl.searchParams.get("token");
  return headerToken === cronSecret || bearer === cronSecret || queryToken === cronSecret;
}

function athensHourNow() {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Athens",
      hour: "2-digit",
      hour12: false
    }).format(new Date())
  );
}

async function runIngest(body: IngestPayload) {
  const date = body.date ?? new Date().toISOString().slice(0, 10);

  let newsText = body.newsText ?? "";
  let techText = body.techText ?? "";

  if (!newsText.trim() && !techText.trim()) {
    const feed = await loadAutomationFeed(date);

    if (!feed || (!feed.newsText.trim() && !feed.techText.trim())) {
      return NextResponse.json(
        {
          error: "Automation feed missing for selected day",
          status: "missing",
          retryable: true
        },
        { status: 404 }
      );
    }

    newsText = feed.newsText;
    techText = feed.techText;
  }

  try {
    const issue = await ingestDailyIssue({
      date,
      newsText,
      techText
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Ingestion failed",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  // Two UTC cron schedules are configured; run only at 09:00 Athens local time.
  if (athensHourNow() !== 9) {
    return NextResponse.json({ status: "skipped", reason: "Outside 09:00 Europe/Athens window" }, { status: 202 });
  }

  return runIngest({
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    newsText: "",
    techText: ""
  });
}

export async function POST(request: NextRequest) {
  let body: IngestPayload;

  try {
    body = (await request.json()) as IngestPayload;
  } catch {
    body = { date: undefined, newsText: "", techText: "" };
  }

  return runIngest(body);
}
