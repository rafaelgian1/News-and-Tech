import { promises as fs } from "node:fs";
import path from "node:path";
import { callJsonLLM } from "@/lib/llm";

export type AutomationFeedPayload = {
  date: string;
  newsText: string;
  techText: string;
  sportsText: string;
};

type RssItem = {
  title: string;
  url: string;
  source: string;
  pubDate?: string;
};

const RSS_TIMEOUT_MS = Number(process.env.PUBLIC_FEED_TIMEOUT_MS ?? "12000");
const RSS_MAX_ITEMS = Number(process.env.PUBLIC_FEED_ITEMS_PER_QUERY ?? "12");

function decodeXml(input: string) {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)));
}

function stripHtml(input: string) {
  return decodeXml(input).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const chunks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  chunks.forEach((chunk) => {
    const titleRaw = parseTag(chunk, "title");
    const url = parseTag(chunk, "link");
    const pubDate = parseTag(chunk, "pubDate") || undefined;

    if (!titleRaw || !url) {
      return;
    }

    const sourceTag = parseTag(chunk, "source");

    let title = titleRaw;
    let source = sourceTag;

    if (!source) {
      const parts = titleRaw.split(" - ");
      if (parts.length > 1) {
        source = parts.at(-1) ?? "";
        title = parts.slice(0, -1).join(" - ").trim();
      }
    }

    if (!source) {
      source = "Google News";
    }

    items.push({ title, url, source, pubDate });
  });

  return items;
}

async function fetchTextWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, RSS_TIMEOUT_MS));

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "DailyBriefBot/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`RSS request failed (${response.status})`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogleNewsRss(query: string): Promise<RssItem[]> {
  const hl = process.env.PUBLIC_FEED_HL ?? "en-US";
  const gl = process.env.PUBLIC_FEED_GL ?? "US";
  const ceid = process.env.PUBLIC_FEED_CEID ?? "US:en";

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;

  try {
    const xml = await fetchTextWithTimeout(url);
    return parseRssItems(xml).slice(0, Math.max(3, RSS_MAX_ITEMS));
  } catch {
    return [];
  }
}

function toSentence(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function pickByKeywords(items: RssItem[], keywords: string[]) {
  const terms = keywords.map((value) => value.toLowerCase());

  const matched = items.find((item) => {
    const hay = item.title.toLowerCase();
    return terms.some((term) => hay.includes(term));
  });

  return matched ?? null;
}

function uniqueSources(items: RssItem[]) {
  return [...new Set(items.map((item) => item.source).filter(Boolean))].slice(0, 10);
}

function buildNewsText(cyprus: RssItem[], greece: RssItem[], world: RssItem[]) {
  const lines: string[] = [];
  const used: RssItem[] = [];

  const cyprusItem = cyprus[0];
  if (cyprusItem) {
    lines.push(toSentence(`Cyprus: ${cyprusItem.title}`));
    used.push(cyprusItem);
  }

  const greeceItem = greece[0];
  if (greeceItem) {
    lines.push(toSentence(`Greece: ${greeceItem.title}`));
    used.push(greeceItem);
  }

  const worldItem = world[0];
  if (worldItem) {
    lines.push(toSentence(`World: ${worldItem.title}`));
    used.push(worldItem);
  }

  if (lines.length === 0) {
    return "";
  }

  const sources = uniqueSources(used);
  if (sources.length > 0) {
    lines.push(`Sources: ${sources.join(", ")}.`);
  }

  return lines.join(" ");
}

function buildTechText(cs: RssItem[], programming: RssItem[], ai: RssItem[], engineering: RssItem[]) {
  const lines: string[] = [];
  const used: RssItem[] = [];

  const csItem = cs[0];
  if (csItem) {
    lines.push(toSentence(`Computer Science: ${csItem.title}`));
    used.push(csItem);
  }

  const programmingItem = programming[0];
  if (programmingItem) {
    lines.push(toSentence(`Programming: ${programmingItem.title}`));
    used.push(programmingItem);
  }

  const aiItem = ai[0];
  if (aiItem) {
    lines.push(toSentence(`AI/LLMs: ${aiItem.title}`));
    used.push(aiItem);
  }

  const engineeringItem = engineering[0];
  if (engineeringItem) {
    lines.push(toSentence(`Engineering: ${engineeringItem.title}`));
    used.push(engineeringItem);
  }

  if (lines.length === 0) {
    return "";
  }

  const sources = uniqueSources(used);
  if (sources.length > 0) {
    lines.push(`Sources: ${sources.join(", ")}.`);
  }

  return lines.join(" ");
}

function pushSportsLine(lines: string[], used: RssItem[], label: string, item: RssItem | null) {
  if (!item) {
    return;
  }

  lines.push(toSentence(`${label}: ${item.title}`));
  used.push(item);
}

function buildSportsText(input: {
  cyprusFootball: RssItem[];
  greekSuperLeague: RssItem[];
  euroleague: RssItem[];
  europeanFootball: RssItem[];
  nationalFootball: RssItem[];
}) {
  const lines: string[] = [];
  const used: RssItem[] = [];

  const cyprusGeneral = input.cyprusFootball[0] ?? null;
  pushSportsLine(lines, used, "Cyprus League (General)", cyprusGeneral);
  pushSportsLine(lines, used, "Apollon Limassol", pickByKeywords(input.cyprusFootball, ["apollon"]));
  pushSportsLine(lines, used, "AEL Limassol", pickByKeywords(input.cyprusFootball, ["ael"]));
  pushSportsLine(lines, used, "APOEL Nicosia", pickByKeywords(input.cyprusFootball, ["apoel"]));
  pushSportsLine(lines, used, "Omonoia Nicosia", pickByKeywords(input.cyprusFootball, ["omonoia"]));
  pushSportsLine(lines, used, "Anorthosis Famagusta", pickByKeywords(input.cyprusFootball, ["anorthosis"]));
  pushSportsLine(lines, used, "AEK Larnaka", pickByKeywords(input.cyprusFootball, ["aek larnaka", "aek"]));

  const greekGeneral = input.greekSuperLeague[0] ?? null;
  pushSportsLine(lines, used, "Greek Super League (General)", greekGeneral);
  pushSportsLine(lines, used, "Olympiacos Piraeus", pickByKeywords(input.greekSuperLeague, ["olympiacos"]));
  pushSportsLine(lines, used, "AEK Athens", pickByKeywords(input.greekSuperLeague, ["aek athens", "aek"]));
  pushSportsLine(lines, used, "Panathinaikos FC", pickByKeywords(input.greekSuperLeague, ["panathinaikos"]));
  pushSportsLine(lines, used, "PAOK FC", pickByKeywords(input.greekSuperLeague, ["paok"]));
  pushSportsLine(lines, used, "Aris FC", pickByKeywords(input.greekSuperLeague, ["aris"]));

  const euroleagueGeneral = input.euroleague[0] ?? null;
  pushSportsLine(lines, used, "EuroLeague (General)", euroleagueGeneral);
  pushSportsLine(lines, used, "Anadolu Efes", pickByKeywords(input.euroleague, ["anadolu efes", "efes"]));
  pushSportsLine(lines, used, "AS Monaco", pickByKeywords(input.euroleague, ["as monaco", "monaco"]));
  pushSportsLine(lines, used, "Baskonia", pickByKeywords(input.euroleague, ["baskonia"]));
  pushSportsLine(lines, used, "Crvena Zvezda", pickByKeywords(input.euroleague, ["crvena", "zvezda"]));
  pushSportsLine(lines, used, "Fenerbahce", pickByKeywords(input.euroleague, ["fenerbahce", "fener"]));
  pushSportsLine(lines, used, "FC Barcelona", pickByKeywords(input.euroleague, ["barcelona"]));
  pushSportsLine(lines, used, "Bayern Munich", pickByKeywords(input.euroleague, ["bayern"]));
  pushSportsLine(lines, used, "Maccabi Tel Aviv", pickByKeywords(input.euroleague, ["maccabi"]));
  pushSportsLine(lines, used, "Olimpia Milano", pickByKeywords(input.euroleague, ["milano", "olimpia milano"]));
  pushSportsLine(lines, used, "Olympiacos", pickByKeywords(input.euroleague, ["olympiacos"]));
  pushSportsLine(lines, used, "Panathinaikos", pickByKeywords(input.euroleague, ["panathinaikos"]));
  pushSportsLine(lines, used, "Paris Basketball", pickByKeywords(input.euroleague, ["paris basketball", "paris"]));
  pushSportsLine(lines, used, "Partizan", pickByKeywords(input.euroleague, ["partizan"]));
  pushSportsLine(lines, used, "Real Madrid", pickByKeywords(input.euroleague, ["real madrid"]));
  pushSportsLine(lines, used, "Valencia Basket", pickByKeywords(input.euroleague, ["valencia"]));
  pushSportsLine(lines, used, "Virtus Bologna", pickByKeywords(input.euroleague, ["virtus", "bologna"]));
  pushSportsLine(lines, used, "Zalgiris Kaunas", pickByKeywords(input.euroleague, ["zalgiris"]));
  pushSportsLine(lines, used, "ASVEL Villeurbanne", pickByKeywords(input.euroleague, ["asvel"]));
  pushSportsLine(lines, used, "Hapoel Tel Aviv", pickByKeywords(input.euroleague, ["hapoel tel aviv", "hapoel"]));
  pushSportsLine(lines, used, "Dubai BC", pickByKeywords(input.euroleague, ["dubai bc", "dubai"]));

  pushSportsLine(lines, used, "UEFA Champions League", pickByKeywords(input.europeanFootball, ["champions league"]));
  pushSportsLine(lines, used, "UEFA Europa League", pickByKeywords(input.europeanFootball, ["europa league"]));
  pushSportsLine(lines, used, "UEFA Conference League", pickByKeywords(input.europeanFootball, ["conference league"]));
  pushSportsLine(lines, used, "Premier League", pickByKeywords(input.europeanFootball, ["premier league"]));
  pushSportsLine(lines, used, "La Liga", pickByKeywords(input.europeanFootball, ["la liga"]));
  pushSportsLine(lines, used, "Serie A", pickByKeywords(input.europeanFootball, ["serie a"]));
  pushSportsLine(lines, used, "Ligue 1", pickByKeywords(input.europeanFootball, ["ligue 1"]));
  pushSportsLine(lines, used, "Bundesliga", pickByKeywords(input.europeanFootball, ["bundesliga"]));

  pushSportsLine(lines, used, "UEFA Euro", pickByKeywords(input.nationalFootball, ["uefa euro", "euro"]));
  pushSportsLine(lines, used, "FIFA World Cup", pickByKeywords(input.nationalFootball, ["world cup"]));
  pushSportsLine(lines, used, "UEFA Nations League", pickByKeywords(input.nationalFootball, ["nations league"]));
  pushSportsLine(lines, used, "Africa Cup of Nations", pickByKeywords(input.nationalFootball, ["africa cup", "afcon", "copa africa"]));
  pushSportsLine(lines, used, "Copa America", pickByKeywords(input.nationalFootball, ["copa america"]));

  if (lines.length === 0) {
    return "";
  }

  const sources = uniqueSources(used);
  if (sources.length > 0) {
    lines.push(`Sources: ${sources.join(", ")}.`);
  }

  return lines.join(" ");
}

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

export async function generateAutomationFeedFromPublicSources(date: string): Promise<AutomationFeedPayload | null> {
  const queries = {
    newsCyprus: "Cyprus news today",
    newsGreece: "Greece news today",
    newsWorld: "world news today",
    techCs: "computer science research news",
    techProgramming: "programming language developer tools news",
    techAi: "AI LLM model release news",
    techEngineering: "software engineering platform infrastructure news",
    sportsCyprusFootball: "Cyprus First Division Apollon AEL APOEL Omonoia Anorthosis AEK Larnaka news",
    sportsGreekLeague: "Greek Super League Olympiacos AEK Panathinaikos PAOK Aris news",
    sportsEuroleague: "EuroLeague basketball teams news",
    sportsEuropeanFootball: "Champions League Europa League Conference League Premier League La Liga Serie A Ligue 1 Bundesliga news",
    sportsNationalFootball: "UEFA Euro World Cup Nations League Copa America Africa Cup of Nations news"
  };

  const [
    newsCyprus,
    newsGreece,
    newsWorld,
    techCs,
    techProgramming,
    techAi,
    techEngineering,
    sportsCyprusFootball,
    sportsGreekLeague,
    sportsEuroleague,
    sportsEuropeanFootball,
    sportsNationalFootball
  ] = await Promise.all([
    fetchGoogleNewsRss(queries.newsCyprus),
    fetchGoogleNewsRss(queries.newsGreece),
    fetchGoogleNewsRss(queries.newsWorld),
    fetchGoogleNewsRss(queries.techCs),
    fetchGoogleNewsRss(queries.techProgramming),
    fetchGoogleNewsRss(queries.techAi),
    fetchGoogleNewsRss(queries.techEngineering),
    fetchGoogleNewsRss(queries.sportsCyprusFootball),
    fetchGoogleNewsRss(queries.sportsGreekLeague),
    fetchGoogleNewsRss(queries.sportsEuroleague),
    fetchGoogleNewsRss(queries.sportsEuropeanFootball),
    fetchGoogleNewsRss(queries.sportsNationalFootball)
  ]);

  const newsText = buildNewsText(newsCyprus, newsGreece, newsWorld);
  const techText = buildTechText(techCs, techProgramming, techAi, techEngineering);
  const sportsText = buildSportsText({
    cyprusFootball: sportsCyprusFootball,
    greekSuperLeague: sportsGreekLeague,
    euroleague: sportsEuroleague,
    europeanFootball: sportsEuropeanFootball,
    nationalFootball: sportsNationalFootball
  });

  if (!newsText && !techText && !sportsText) {
    return null;
  }

  return {
    date,
    newsText,
    techText,
    sportsText
  };
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
