import { promises as fs } from "node:fs";
import path from "node:path";
import { callJsonLLM } from "@/lib/llm";

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

export async function generateAutomationFeedFromLLM(date: string): Promise<AutomationFeedPayload | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const prompt = `You are creating daily raw feed text for a briefing pipeline.

DATE
${date}

Return only valid JSON:
{
  "newsText": "...",
  "techText": "..."
}

Requirements:
- newsText must include Cyprus, Greece, and Worldwide updates.
- techText must include Computer Science, Programming, AI/LLMs, and Engineering updates.
- Keep each text concise but information-dense.
- Include clear source mentions in each text as "Sources: ..." with reputable outlets.
- If you are uncertain, include a short uncertainty note instead of fabricating specifics.`;

  try {
    const raw = (await callJsonLLM(prompt)) as {
      newsText?: string;
      techText?: string;
    };

    const newsText = raw.newsText?.trim() ?? "";
    const techText = raw.techText?.trim() ?? "";

    if (!newsText && !techText) {
      return null;
    }

    return {
      date,
      newsText,
      techText
    };
  } catch {
    return null;
  }
}
