import { promises as fs } from "node:fs";
import path from "node:path";
import { callJsonLLM } from "@/lib/llm";

export type AutomationFeedPayload = {
  date: string;
  newsText: string;
  techText: string;
  sportsText: string;
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
          techText: payload.techText ?? "",
          sportsText: payload.sportsText ?? ""
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
      techText: parsed.techText ?? "",
      sportsText: parsed.sportsText ?? ""
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
  "techText": "...",
  "sportsText": "..."
}

Requirements:
- newsText must include Cyprus, Greece, and Worldwide updates.
- techText must include Computer Science, Programming, AI/LLMs, and Engineering updates.
- sportsText must include:
  1) Cyprus football league (general + Apollon, AEL, APOEL, Omonoia, Anorthosis, AEK Larnaka)
  2) Greek Super League (general + Olympiacos, AEK Athens, Panathinaikos, PAOK, Aris)
  3) EuroLeague (general + team-level notes)
  4) European football (Champions League, Europa League, Conference League, Premier League, La Liga, Serie A, Ligue 1, Bundesliga)
  5) National football (Euro, World Cup, Nations League, Copa Africa, Copa America)
  6) Match center for the selected date with competitions and either:
     - kickoff time in Europe/Athens if match has not started/finished yet
     - final score/result if match already completed on that date
- Keep each text concise but information-dense.
- Include clear source mentions in each text as "Sources: ..." with reputable outlets.
- If unsure, state uncertainty briefly instead of inventing specifics.`;

  try {
    const raw = (await callJsonLLM(prompt)) as {
      newsText?: string;
      techText?: string;
      sportsText?: string;
    };

    const newsText = raw.newsText?.trim() ?? "";
    const techText = raw.techText?.trim() ?? "";
    const sportsText = raw.sportsText?.trim() ?? "";

    if (!newsText && !techText && !sportsText) {
      return null;
    }

    return {
      date,
      newsText,
      techText,
      sportsText
    };
  } catch {
    return null;
  }
}
