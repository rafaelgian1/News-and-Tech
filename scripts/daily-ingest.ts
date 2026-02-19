import { loadAutomationFeed } from "@/lib/automationFeed";
import { ingestDailyIssue } from "@/lib/service";

async function main() {
  const dateArg = process.argv[2];
  const date = dateArg ?? new Date().toISOString().slice(0, 10);

  const feed = await loadAutomationFeed(date);

  if (!feed || (!feed.newsText.trim() && !feed.techText.trim())) {
    console.error(`[daily-ingest] Missing automation content for ${date}`);
    process.exit(1);
  }

  const issue = await ingestDailyIssue({
    date,
    newsText: feed.newsText,
    techText: feed.techText
  });

  console.log(`[daily-ingest] Ingested issue ${issue.date} with status ${issue.status}`);
}

main().catch((error) => {
  console.error("[daily-ingest] Failed:", error);
  process.exit(1);
});
