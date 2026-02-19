import { sectionDefaultSubsection, SECTION_DEFINITIONS } from "@/lib/sections";
import { BriefItem, CoverBlock, DailyIssue, Subsection } from "@/lib/types";

type SourceBucket = "news" | "tech" | "sports";

type TargetRule = {
  source: SourceBucket;
  block: CoverBlock;
  subsection: string;
  patterns: RegExp[];
};

const TARGET_RULES: TargetRule[] = [
  { source: "news", block: "news", subsection: "cyprus", patterns: [/\bcyprus\b/i, /\bnicosia\b/i, /\blimassol\b/i] },
  { source: "news", block: "news", subsection: "greece", patterns: [/\bgreece\b/i, /\bgreek\b/i, /\bathens\b/i] },
  { source: "news", block: "news", subsection: "world", patterns: [/\bworld\b/i, /\bglobal\b/i, /\binternational\b/i] },

  {
    source: "tech",
    block: "tech",
    subsection: "cs",
    patterns: [/\bcomputer science\b/i, /\bresearch\b/i, /\bbenchmark\b/i, /\barxiv\b/i]
  },
  {
    source: "tech",
    block: "tech",
    subsection: "programming",
    patterns: [/\bprogramming\b/i, /\blanguage\b/i, /\bcompiler\b/i, /\btypescript\b/i, /\bpython\b/i]
  },
  {
    source: "tech",
    block: "tech",
    subsection: "ai_llm",
    patterns: [/\bai\b/i, /\bllm\b/i, /\bmodel\b/i, /\binference\b/i, /\bprompt\b/i]
  },
  {
    source: "tech",
    block: "tech",
    subsection: "other",
    patterns: [/\bengineering\b/i, /\bplatform\b/i, /\binfrastructure\b/i, /\bdevops\b/i, /\barchitecture\b/i]
  },

  {
    source: "sports",
    block: "match_center",
    subsection: "football_cyprus_league",
    patterns: [/\bcyprus league\b/i, /\bcypriot league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_greek_super_league",
    patterns: [/\bgreek super league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_champions_league",
    patterns: [/\bchampions league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_europa_league",
    patterns: [/\beuropa league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_conference_league",
    patterns: [/\bconference league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_premier_league",
    patterns: [/\bpremier league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_bundesliga",
    patterns: [/\bbundesliga\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_serie_a",
    patterns: [/\bserie a\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_ligue_1",
    patterns: [/\bligue 1\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "football_la_liga",
    patterns: [/\bla liga\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "basketball_euroleague",
    patterns: [/\beuroleague\b/i, /\beuroliga\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "basketball_greek_league",
    patterns: [/\bgreek basketball league\b/i, /\bbasket league\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "national_euro",
    patterns: [/\buefa euro\b/i, /\beuro\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "national_world_cup",
    patterns: [/\bworld cup\b/i]
  },
  {
    source: "sports",
    block: "match_center",
    subsection: "national_nations_league",
    patterns: [/\bnations league\b/i]
  },

  {
    source: "sports",
    block: "cyprus_football",
    subsection: "cyprus_league_general",
    patterns: [/\bcyprus league\b/i, /\bcypriot football\b/i]
  },
  { source: "sports", block: "cyprus_football", subsection: "apollon_limassol", patterns: [/\bapollon\b/i] },
  { source: "sports", block: "cyprus_football", subsection: "ael_limassol", patterns: [/\bael\b/i] },
  { source: "sports", block: "cyprus_football", subsection: "apoel_nicosia", patterns: [/\bapoel\b/i] },
  { source: "sports", block: "cyprus_football", subsection: "omonoia_nicosia", patterns: [/\bomonoia\b/i] },
  {
    source: "sports",
    block: "cyprus_football",
    subsection: "anorthosis_famagusta",
    patterns: [/\banorthosis\b/i]
  },
  { source: "sports", block: "cyprus_football", subsection: "aek_larnaka", patterns: [/\baek larnaka\b/i] },

  {
    source: "sports",
    block: "greek_super_league",
    subsection: "greek_super_league_general",
    patterns: [/\bgreek super league\b/i]
  },
  {
    source: "sports",
    block: "greek_super_league",
    subsection: "olympiacos_piraeus",
    patterns: [/\bolympiacos\b/i]
  },
  { source: "sports", block: "greek_super_league", subsection: "aek_athens", patterns: [/\baek athens\b/i] },
  {
    source: "sports",
    block: "greek_super_league",
    subsection: "panathinaikos_fc",
    patterns: [/\bpanathinaikos\b/i]
  },
  { source: "sports", block: "greek_super_league", subsection: "paok_fc", patterns: [/\bpaok\b/i] },
  { source: "sports", block: "greek_super_league", subsection: "aris_fc", patterns: [/\baris\b/i] },

  { source: "sports", block: "euroleague", subsection: "euroleague_general", patterns: [/\beuroleague\b/i] },
  { source: "sports", block: "euroleague", subsection: "anadolu_efes", patterns: [/\banadolu efes\b/i] },
  { source: "sports", block: "euroleague", subsection: "as_monaco", patterns: [/\bas monaco\b/i] },
  { source: "sports", block: "euroleague", subsection: "baskonia", patterns: [/\bbaskonia\b/i] },
  { source: "sports", block: "euroleague", subsection: "crvena_zvezda", patterns: [/\bcrvena\b/i, /\bzvezda\b/i] },
  { source: "sports", block: "euroleague", subsection: "fenerbahce", patterns: [/\bfenerbahce\b/i] },
  { source: "sports", block: "euroleague", subsection: "fc_barcelona", patterns: [/\bbarcelona\b/i] },
  { source: "sports", block: "euroleague", subsection: "bayern_munich", patterns: [/\bbayern\b/i] },
  { source: "sports", block: "euroleague", subsection: "maccabi_tel_aviv", patterns: [/\bmaccabi\b/i] },
  { source: "sports", block: "euroleague", subsection: "olimpia_milano", patterns: [/\bolimpia milano\b/i, /\bmilano\b/i] },
  { source: "sports", block: "euroleague", subsection: "olympiacos", patterns: [/\bolympiacos\b/i] },
  { source: "sports", block: "euroleague", subsection: "panathinaikos", patterns: [/\bpanathinaikos\b/i] },
  { source: "sports", block: "euroleague", subsection: "paris_basketball", patterns: [/\bparis basketball\b/i] },
  { source: "sports", block: "euroleague", subsection: "partizan", patterns: [/\bpartizan\b/i] },
  { source: "sports", block: "euroleague", subsection: "real_madrid", patterns: [/\breal madrid\b/i] },
  { source: "sports", block: "euroleague", subsection: "valencia_basket", patterns: [/\bvalencia\b/i] },
  { source: "sports", block: "euroleague", subsection: "virtus_bologna", patterns: [/\bvirtus\b/i, /\bbologna\b/i] },
  { source: "sports", block: "euroleague", subsection: "zalgiris", patterns: [/\bzalgiris\b/i] },
  { source: "sports", block: "euroleague", subsection: "asvel", patterns: [/\basvel\b/i] },
  { source: "sports", block: "euroleague", subsection: "hapoel_tel_aviv", patterns: [/\bhapoel\b/i] },
  { source: "sports", block: "euroleague", subsection: "dubai_bc", patterns: [/\bdubai bc\b/i, /\bdubai\b/i] },

  {
    source: "sports",
    block: "european_football",
    subsection: "champions_league",
    patterns: [/\bchampions league\b/i]
  },
  { source: "sports", block: "european_football", subsection: "europa_league", patterns: [/\beuropa league\b/i] },
  {
    source: "sports",
    block: "european_football",
    subsection: "conference_league",
    patterns: [/\bconference league\b/i]
  },
  { source: "sports", block: "european_football", subsection: "premier_league", patterns: [/\bpremier league\b/i] },
  { source: "sports", block: "european_football", subsection: "la_liga", patterns: [/\bla liga\b/i] },
  { source: "sports", block: "european_football", subsection: "serie_a", patterns: [/\bserie a\b/i] },
  { source: "sports", block: "european_football", subsection: "ligue_1", patterns: [/\bligue 1\b/i] },
  { source: "sports", block: "european_football", subsection: "bundesliga", patterns: [/\bbundesliga\b/i] },

  { source: "sports", block: "national_football", subsection: "euro", patterns: [/\buefa euro\b/i, /\beuro\b/i] },
  { source: "sports", block: "national_football", subsection: "world_cup", patterns: [/\bworld cup\b/i] },
  {
    source: "sports",
    block: "national_football",
    subsection: "nations_league",
    patterns: [/\bnations league\b/i]
  },
  {
    source: "sports",
    block: "national_football",
    subsection: "copa_africa",
    patterns: [/\bcopa africa\b/i, /\bafrica cup\b/i]
  },
  {
    source: "sports",
    block: "national_football",
    subsection: "copa_america",
    patterns: [/\bcopa america\b/i]
  }
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function classifySentence(sentence: string, source: SourceBucket): { block: CoverBlock; subsection: string } {
  const matched = TARGET_RULES.filter(
    (rule) => rule.source === source && rule.patterns.some((pattern) => pattern.test(sentence))
  );

  if (matched.length > 0) {
    if (source === "sports") {
      const nonMatchCenter = matched.find((rule) => rule.block !== "match_center");
      if (nonMatchCenter) {
        return {
          block: nonMatchCenter.block,
          subsection: nonMatchCenter.subsection
        };
      }
    }

    return {
      block: matched[0].block,
      subsection: matched[0].subsection
    };
  }

  if (source === "news") {
    return { block: "news", subsection: sectionDefaultSubsection("news") };
  }
  if (source === "tech") {
    return { block: "tech", subsection: sectionDefaultSubsection("tech") };
  }

  return {
    block: "match_center",
    subsection: sectionDefaultSubsection("match_center")
  };
}

function sentenceToHeadline(sentence: string): string {
  const clean = sentence.replace(/^\w+:\s*/i, "").trim();
  const clipped = clean.length > 110 ? `${clean.slice(0, 107).trimEnd()}...` : clean;
  return clipped || "Daily update";
}

function buildItem(sentence: string, subsectionLabel: string, sources: Array<{ title: string; url: string; publisher?: string }>): BriefItem {
  const headline = sentenceToHeadline(sentence);

  return {
    headline,
    keyFacts: [sentence],
    analysis: `${subsectionLabel} developments suggest ongoing momentum with short-term operational impact to monitor.`,
    implications: [
      `Teams exposed to ${subsectionLabel.toLowerCase()} developments should review near-term dependencies.`,
      "Decision windows are tightening as updates become more frequent."
    ],
    watchNext: ["Official follow-up statements or implementation timelines.", "Any contradictory reporting from major sources."],
    credibilityNotes: /mixed|conflict|unclear|disagree/i.test(sentence)
      ? "Signals appear mixed across sources; treat early details as provisional."
      : undefined,
    sources
  };
}

function extractSourceNames(text: string): string[] {
  const match = text.match(/sources?:\s*([^\n]+)/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(/,|\band\b/i)
    .map((part) => part.trim().replace(/[.;]$/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function toSourceLinks(sourceNames: string[]): Array<{ title: string; url: string; publisher?: string }> {
  return sourceNames.map((name) => ({
    title: name,
    publisher: name,
    url: `https://www.google.com/search?q=${encodeURIComponent(name)}`
  }));
}

function createAutoLabelFromKey(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ensureSubsection(issue: DailyIssue, block: CoverBlock, subsectionKey: string): Subsection {
  const section = issue.sections[block];
  if (!section[subsectionKey]) {
    section[subsectionKey] = {
      label: createAutoLabelFromKey(subsectionKey),
      items: []
    };
  }

  return section[subsectionKey];
}

function pushToSection(issue: DailyIssue, block: CoverBlock, subsectionKey: string, item: BriefItem) {
  const subsection = ensureSubsection(issue, block, subsectionKey);
  subsection.items.push(item);
}

function fillNarratives(issue: DailyIssue) {
  SECTION_DEFINITIONS.forEach((section) => {
    Object.values(issue.sections[section.key]).forEach((subsection) => {
      if (subsection.items.length === 0) {
        subsection.narrative = "No major updates were captured for this subsection in the latest automation feed.";
        return;
      }

      const top = subsection.items.slice(0, 2).map((item) => item.headline).join("; ");
      subsection.narrative =
        `What happened: ${top}. Why it matters: this can change near-term priorities and execution timing. ` +
        "Watch: confirmation from primary sources and concrete next steps.";
    });
  });
}

function totalItems(issue: DailyIssue) {
  return SECTION_DEFINITIONS.reduce((acc, section) => {
    return acc + Object.values(issue.sections[section.key]).reduce((inner, subsection) => inner + subsection.items.length, 0);
  }, 0);
}

function processText(issue: DailyIssue, source: SourceBucket, text: string, sourceLinks: Array<{ title: string; url: string; publisher?: string }>) {
  splitSentences(text)
    .filter((sentence) => !/^sources?:/i.test(sentence))
    .forEach((sentence) => {
      const target = classifySentence(sentence, source);
      const subsection = ensureSubsection(issue, target.block, target.subsection);
      pushToSection(issue, target.block, target.subsection, buildItem(sentence, subsection.label, sourceLinks));
    });
}

export function parseWithoutLLM(issue: DailyIssue, input: { newsText: string; techText: string; sportsText?: string }) {
  const newsSources = toSourceLinks(extractSourceNames(input.newsText));
  const techSources = toSourceLinks(extractSourceNames(input.techText));
  const sportsSources = toSourceLinks(extractSourceNames(input.sportsText ?? ""));

  processText(issue, "news", input.newsText, newsSources);
  processText(issue, "tech", input.techText, techSources);
  processText(issue, "sports", input.sportsText ?? "", sportsSources);

  fillNarratives(issue);
  issue.status = totalItems(issue) > 0 ? "ready" : "partial";
  return issue;
}
