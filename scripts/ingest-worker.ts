import cron from "node-cron";
import { loadAutomationFeed } from "@/lib/automationFeed";
import { ingestDailyIssue } from "@/lib/service";

const schedule = process.env.INGEST_CRON ?? "5 7 * * *";

async function runIngest(date: string) {
  const feed = await loadAutomationFeed(date);

  if (!feed || (!feed.newsText.trim() && !feed.techText.trim())) {
    console.warn(`[worker] No automation payload for ${date}`);
    return;
  }

  const issue = await ingestDailyIssue({
    date,
    newsText: feed.newsText,
    techText: feed.techText
  });

  console.log(`[worker] Ingested ${issue.date} (${issue.status})`);
}

cron.schedule(schedule, () => {
  const date = new Date().toISOString().slice(0, 10);
  void runIngest(date).catch((error) => {
    console.error("[worker] ingest failed", error);
  });
});

console.log(`[worker] Running with schedule '${schedule}'`);
console.log("[worker] Keep this process alive to execute daily ingestion.");
