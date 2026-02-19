import { promises as fs } from "node:fs";
import path from "node:path";

export type AutomationFeedPayload = {
  date: string;
  newsText: string;
  techText: string;
};

export async function loadAutomationFeed(date: string): Promise<AutomationFeedPayload | null> {
  const endpoint = process.env.AUTOMATION_FEED_URL;

  if (endpoint) {
    try {
      const response = await fetch(`${endpoint}?date=${encodeURIComponent(date)}`, {
        headers: process.env.AUTOMATION_FEED_TOKEN
          ? {
              Authorization: `Bearer ${process.env.AUTOMATION_FEED_TOKEN}`
            }
          : undefined,
        cache: "no-store"
      });

      if (response.ok) {
        const payload = (await response.json()) as Partial<AutomationFeedPayload>;
        return {
          date,
          newsText: payload.newsText ?? "",
          techText: payload.techText ?? ""
        };
      }
    } catch {
      // Fall through to local-file strategy.
    }
  }

  const localPath = path.join(process.cwd(), "automation", `${date}.json`);
  try {
    const raw = await fs.readFile(localPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AutomationFeedPayload>;
    return {
      date,
      newsText: parsed.newsText ?? "",
      techText: parsed.techText ?? ""
    };
  } catch {
    return null;
  }
}
