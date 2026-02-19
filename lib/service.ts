import { parseAutomationPayload } from "@/lib/parser";
import {
  getIssueByDate,
  getLatestIssue,
  getOrCreateCover,
  listArchivedIssues,
  listRecentIssues,
  logIngest,
  rotateIntoArchive,
  saveIssue
} from "@/lib/repository";
import { DailyIssue, IngestPayload } from "@/lib/types";

export async function ingestDailyIssue(payload: IngestPayload): Promise<DailyIssue> {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);

  try {
    const parsed = await parseAutomationPayload({ ...payload, date });
    const newsCover = await getOrCreateCover(parsed, "news");
    const techCover = await getOrCreateCover(parsed, "tech");

    const issue: DailyIssue = {
      ...parsed,
      date,
      covers: {
        news: newsCover,
        tech: techCover
      },
      updatedAt: new Date().toISOString()
    };

    await saveIssue(issue, {
      newsText: payload.newsText,
      techText: payload.techText
    });

    await rotateIntoArchive(date);
    await logIngest(date, "success");

    return issue;
  } catch (error) {
    await logIngest(date, "error", error instanceof Error ? error.message : "Unknown ingest error");
    throw error;
  }
}

export async function getIssueWithCovers(date: string): Promise<DailyIssue | null> {
  await rotateIntoArchive(new Date().toISOString().slice(0, 10));
  return getIssueByDate(date);
}

export async function getIssueOrLatest(date: string): Promise<{ issue: DailyIssue | null; requestedDateFound: boolean }> {
  await rotateIntoArchive(new Date().toISOString().slice(0, 10));

  const direct = await getIssueByDate(date);
  if (direct) {
    return { issue: direct, requestedDateFound: true };
  }

  return { issue: await getLatestIssue(), requestedDateFound: false };
}

export async function getRecentWindow(limit = 7) {
  await rotateIntoArchive(new Date().toISOString().slice(0, 10));
  return listRecentIssues(limit);
}

export async function getArchiveWindow(limit = 60) {
  return listArchivedIssues(limit);
}
