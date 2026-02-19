import { BriefItem, DailyIssue } from "@/lib/types";

type MatchBucketKey =
  | "football_cyprus_league"
  | "football_greek_super_league"
  | "football_champions_league"
  | "football_europa_league"
  | "football_conference_league"
  | "football_premier_league"
  | "football_bundesliga"
  | "football_serie_a"
  | "football_ligue_1"
  | "football_la_liga"
  | "basketball_euroleague"
  | "basketball_greek_league"
  | "national_euro"
  | "national_world_cup"
  | "national_nations_league";

type SportKind = "football" | "basketball";

type UnifiedGame = {
  sport: SportKind;
  dateIso: string;
  competition: string;
  country?: string;
  statusShort: string;
  statusLong: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  sourceUrl: string;
};

type BucketRule = {
  key: MatchBucketKey;
  match: (game: UnifiedGame) => boolean;
};

const FOOTBALL_ENDPOINT = process.env.SPORTS_FOOTBALL_ENDPOINT ?? "https://v3.football.api-sports.io/fixtures";
const BASKETBALL_ENDPOINT = process.env.SPORTS_BASKETBALL_ENDPOINT ?? "https://v1.basketball.api-sports.io/games";
const SPORTS_TIMEZONE = process.env.SPORTS_TIMEZONE ?? "Europe/Athens";
const REQUEST_TIMEOUT_MS = Number(process.env.SPORTS_API_TIMEOUT_MS ?? "12000");

const FOOTBALL_DOC_URL = "https://api-sports.io/sports/football";
const BASKETBALL_DOC_URL = "https://api-sports.io/sports/basketball";

const matchBuckets: BucketRule[] = [
  {
    key: "football_cyprus_league",
    match: (game) => game.sport === "football" && /cyprus/i.test(game.country ?? "") && /(division|1st|1\.)/i.test(game.competition)
  },
  {
    key: "football_greek_super_league",
    match: (game) => game.sport === "football" && /greece/i.test(game.country ?? "") && /super\s*league/i.test(game.competition)
  },
  {
    key: "football_champions_league",
    match: (game) => game.sport === "football" && /champions\s*league/i.test(game.competition)
  },
  {
    key: "football_europa_league",
    match: (game) => game.sport === "football" && /europa\s*league/i.test(game.competition) && !/conference/i.test(game.competition)
  },
  {
    key: "football_conference_league",
    match: (game) => game.sport === "football" && /conference\s*league/i.test(game.competition)
  },
  {
    key: "football_premier_league",
    match: (game) => game.sport === "football" && /england/i.test(game.country ?? "") && /premier\s*league/i.test(game.competition)
  },
  {
    key: "football_bundesliga",
    match: (game) => game.sport === "football" && /germany/i.test(game.country ?? "") && /bundesliga/i.test(game.competition)
  },
  {
    key: "football_serie_a",
    match: (game) => game.sport === "football" && /italy/i.test(game.country ?? "") && /serie\s*a/i.test(game.competition)
  },
  {
    key: "football_ligue_1",
    match: (game) => game.sport === "football" && /france/i.test(game.country ?? "") && /ligue\s*1/i.test(game.competition)
  },
  {
    key: "football_la_liga",
    match: (game) => game.sport === "football" && /spain/i.test(game.country ?? "") && /(la\s*liga|primera\s*division)/i.test(game.competition)
  },
  {
    key: "basketball_euroleague",
    match: (game) => game.sport === "basketball" && /euroleague/i.test(game.competition)
  },
  {
    key: "basketball_greek_league",
    match: (game) => game.sport === "basketball" && /greece/i.test(game.country ?? "") && /(basket\s*league|a1|heba|esake|gbl)/i.test(game.competition)
  },
  {
    key: "national_euro",
    match: (game) => game.sport === "football" && /(uefa\s*euro|european\s*championship)/i.test(game.competition)
  },
  {
    key: "national_world_cup",
    match: (game) => game.sport === "football" && /world\s*cup/i.test(game.competition)
  },
  {
    key: "national_nations_league",
    match: (game) => game.sport === "football" && /nations\s*league/i.test(game.competition)
  }
];

function toLowerSafe(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function gameDateToAthensTime(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SPORTS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function classifyStatus(statusShort: string) {
  const short = statusShort.toUpperCase();

  if (["FT", "AET", "PEN", "AOT", "AWD", "WO", "ABD", "CANC"].includes(short)) {
    return "finished" as const;
  }

  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "Q1", "Q2", "Q3", "Q4", "OT"].includes(short)) {
    return "live" as const;
  }

  return "upcoming" as const;
}

function requestHeaders(targetUrl: string) {
  const apiSportsKey = process.env.SPORTS_API_KEY?.trim();
  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();

  if (!apiSportsKey && !rapidApiKey) {
    return null;
  }

  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (apiSportsKey) {
    headers["x-apisports-key"] = apiSportsKey;
  }

  if (rapidApiKey) {
    headers["x-rapidapi-key"] = rapidApiKey;
    if (!headers["x-rapidapi-host"]) {
      try {
        headers["x-rapidapi-host"] = new URL(targetUrl).host;
      } catch {
        // noop
      }
    }
  }

  return headers;
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const headers = requestHeaders(url);
  if (!headers) {
    throw new Error("Sports API key missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, REQUEST_TIMEOUT_MS));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Sports API request failed (${response.status})`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeFootballDate(row: Record<string, unknown>) {
  const fixture = (row.fixture ?? {}) as Record<string, unknown>;
  const dateIso = typeof fixture.date === "string" ? fixture.date : "";

  if (dateIso) {
    return dateIso;
  }

  const date = typeof row.date === "string" ? row.date : "";
  const time = typeof row.time === "string" ? row.time : "00:00";
  return date ? `${date}T${time}:00Z` : new Date().toISOString();
}

function parseFootballGames(payload: unknown): UnifiedGame[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const rows = Array.isArray((payload as Record<string, unknown>).response)
    ? ((payload as Record<string, unknown>).response as unknown[])
    : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => {
      const fixture = (row.fixture ?? {}) as Record<string, unknown>;
      const league = (row.league ?? {}) as Record<string, unknown>;
      const teams = (row.teams ?? {}) as Record<string, unknown>;
      const home = (teams.home ?? {}) as Record<string, unknown>;
      const away = (teams.away ?? {}) as Record<string, unknown>;
      const goals = (row.goals ?? {}) as Record<string, unknown>;
      const status = (fixture.status ?? {}) as Record<string, unknown>;

      const fixtureId = typeof fixture.id === "number" ? fixture.id : null;

      return {
        sport: "football" as const,
        dateIso: normalizeFootballDate(row),
        competition: typeof league.name === "string" ? league.name : "Football",
        country: typeof league.country === "string" ? league.country : undefined,
        statusShort: typeof status.short === "string" ? status.short : "NS",
        statusLong: typeof status.long === "string" ? status.long : "Not Started",
        homeTeam: typeof home.name === "string" ? home.name : "Home",
        awayTeam: typeof away.name === "string" ? away.name : "Away",
        homeScore: asNumber(goals.home),
        awayScore: asNumber(goals.away),
        sourceUrl: fixtureId
          ? `https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures?id=${fixtureId}`
          : FOOTBALL_DOC_URL
      };
    });
}

function normalizeBasketballDate(row: Record<string, unknown>) {
  const dateIso = typeof row.date === "string" ? row.date : "";
  if (dateIso.includes("T")) {
    return dateIso;
  }

  const time = typeof row.time === "string" ? row.time : "00:00";
  return dateIso ? `${dateIso}T${time}:00Z` : new Date().toISOString();
}

function parseBasketballGames(payload: unknown): UnifiedGame[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const rows = Array.isArray((payload as Record<string, unknown>).response)
    ? ((payload as Record<string, unknown>).response as unknown[])
    : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => {
      const league = (row.league ?? {}) as Record<string, unknown>;
      const teams = (row.teams ?? {}) as Record<string, unknown>;
      const home = (teams.home ?? {}) as Record<string, unknown>;
      const away = (teams.away ?? {}) as Record<string, unknown>;
      const status = (row.status ?? {}) as Record<string, unknown>;
      const scores = (row.scores ?? {}) as Record<string, unknown>;
      const homeScores = (scores.home ?? {}) as Record<string, unknown>;
      const awayScores = (scores.away ?? {}) as Record<string, unknown>;

      const gameId = asNumber(row.id);

      return {
        sport: "basketball" as const,
        dateIso: normalizeBasketballDate(row),
        competition: typeof league.name === "string" ? league.name : "Basketball",
        country: typeof league.country === "string" ? league.country : undefined,
        statusShort: typeof status.short === "string" ? status.short : "NS",
        statusLong: typeof status.long === "string" ? status.long : "Not Started",
        homeTeam: typeof home.name === "string" ? home.name : "Home",
        awayTeam: typeof away.name === "string" ? away.name : "Away",
        homeScore: asNumber(homeScores.total),
        awayScore: asNumber(awayScores.total),
        sourceUrl: gameId ? `${BASKETBALL_DOC_URL}#game-${gameId}` : BASKETBALL_DOC_URL
      };
    });
}

function mapGameToBriefItem(game: UnifiedGame): BriefItem {
  const state = classifyStatus(game.statusShort);
  const athensTime = gameDateToAthensTime(game.dateIso);

  const scoreText =
    game.homeScore !== null && game.awayScore !== null ? `${game.homeTeam} ${game.homeScore}-${game.awayScore} ${game.awayTeam}` : "";

  const headline =
    state === "finished"
      ? scoreText || `${game.homeTeam} vs ${game.awayTeam} (${game.statusLong})`
      : state === "live"
        ? scoreText || `${game.homeTeam} vs ${game.awayTeam} (${game.statusLong})`
        : `${game.homeTeam} vs ${game.awayTeam} · ${athensTime} Athens`;

  const keyFacts = [
    `Competition: ${game.competition}${game.country ? ` (${game.country})` : ""}`,
    state === "finished"
      ? scoreText
        ? `Final score: ${scoreText}`
        : `Status: ${game.statusLong}`
      : state === "live"
        ? `Live status: ${game.statusLong}`
        : `Kickoff: ${athensTime} (${SPORTS_TIMEZONE})`
  ];

  return {
    headline,
    keyFacts,
    analysis:
      state === "finished"
        ? "The result is now confirmed and can immediately affect standings, qualification paths, and short-term team momentum."
        : state === "live"
          ? "The game is currently in progress, so tactical swings and game-state volatility can still change the outcome."
          : "The upcoming fixture can influence near-term standings and preparation windows once lineups and final team news are confirmed.",
    implications: [
      "Monitor official competition updates for standings and tie-break impacts.",
      "Track lineup and injury changes close to kickoff or tip-off for decision-making."
    ],
    watchNext: [
      state === "upcoming" ? "Official starting lineups and late availability updates." : "Post-game reports and updated standings.",
      "Any disciplinary or injury announcements after the match window."
    ],
    credibilityNotes: undefined,
    sources: [
      {
        title: game.sport === "football" ? "API-SPORTS Football" : "API-SPORTS Basketball",
        url: game.sourceUrl,
        publisher: "API-SPORTS"
      }
    ]
  };
}

function buildNarrative(label: string, date: string, items: BriefItem[]) {
  if (items.length === 0) {
    return `No scheduled or completed matches were detected for ${label} on ${date} in ${SPORTS_TIMEZONE}.`;
  }

  const lower = items.map((item) => toLowerSafe(item.headline));
  const finished = lower.filter((text) => /\b\d+\s*-\s*\d+\b/.test(text)).length;
  const upcoming = lower.filter((text) => /athens/.test(text)).length;
  const live = Math.max(0, items.length - finished - upcoming);

  return `${items.length} match updates for ${label} on ${date}: ${upcoming} upcoming, ${live} live/in-progress, ${finished} completed. All times are shown in ${SPORTS_TIMEZONE}.`;
}

function emptyMatchCenterMap() {
  return {
    football_cyprus_league: [],
    football_greek_super_league: [],
    football_champions_league: [],
    football_europa_league: [],
    football_conference_league: [],
    football_premier_league: [],
    football_bundesliga: [],
    football_serie_a: [],
    football_ligue_1: [],
    football_la_liga: [],
    basketball_euroleague: [],
    basketball_greek_league: [],
    national_euro: [],
    national_world_cup: [],
    national_nations_league: []
  } as Record<MatchBucketKey, UnifiedGame[]>;
}

function populateBuckets(games: UnifiedGame[]) {
  const buckets = emptyMatchCenterMap();

  games.forEach((game) => {
    for (const rule of matchBuckets) {
      if (rule.match(game)) {
        buckets[rule.key].push(game);
        break;
      }
    }
  });

  Object.values(buckets).forEach((bucket) => {
    bucket.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
  });

  return buckets;
}

function countIssueItems(issue: DailyIssue) {
  return Object.values(issue.sections).reduce((acc, section) => {
    return acc + Object.values(section).reduce((sectionAcc, subsection) => sectionAcc + subsection.items.length, 0);
  }, 0);
}

export function hasSportsDataApiConfig() {
  return Boolean(process.env.SPORTS_API_KEY?.trim() || process.env.RAPIDAPI_KEY?.trim());
}

export async function fetchRealMatchCenterGames(date: string): Promise<Record<MatchBucketKey, UnifiedGame[]>> {
  if (!hasSportsDataApiConfig()) {
    return emptyMatchCenterMap();
  }

  const footballUrl = new URL(FOOTBALL_ENDPOINT);
  footballUrl.searchParams.set("date", date);
  footballUrl.searchParams.set("timezone", SPORTS_TIMEZONE);

  const basketballUrl = new URL(BASKETBALL_ENDPOINT);
  basketballUrl.searchParams.set("date", date);
  basketballUrl.searchParams.set("timezone", SPORTS_TIMEZONE);

  const [footballPayload, basketballPayload] = await Promise.all([
    fetchJsonWithTimeout(footballUrl.toString()),
    fetchJsonWithTimeout(basketballUrl.toString())
  ]);

  const games = [...parseFootballGames(footballPayload), ...parseBasketballGames(basketballPayload)];
  return populateBuckets(games);
}

export async function applySportsApiToIssue(issue: DailyIssue): Promise<DailyIssue> {
  if (!hasSportsDataApiConfig()) {
    return issue;
  }

  try {
    const matchMap = await fetchRealMatchCenterGames(issue.date);
    const next = structuredClone(issue);

    const matchCenter = next.sections.match_center;
    (Object.keys(matchMap) as MatchBucketKey[]).forEach((subsectionKey) => {
      const subsection = matchCenter[subsectionKey];
      if (!subsection) {
        return;
      }

      const items = matchMap[subsectionKey].map(mapGameToBriefItem);
      subsection.items = items;
      subsection.narrative = buildNarrative(subsection.label, issue.date, items);
    });

    if (countIssueItems(next) > 0) {
      next.status = "ready";
    }

    return next;
  } catch {
    return issue;
  }
}
