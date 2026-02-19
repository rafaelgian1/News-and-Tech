import { BriefItem, DailyIssue, Subsection } from "@/lib/types";

type TargetKey =
  | "news.cyprus"
  | "news.greece"
  | "news.world"
  | "tech.cs"
  | "tech.programming"
  | "tech.ai_llm"
  | "tech.other";

const TARGET_RULES: Array<{ key: TargetKey; patterns: RegExp[] }> = [
  { key: "news.cyprus", patterns: [/\bcyprus\b/i, /\bnicosia\b/i] },
  { key: "news.greece", patterns: [/\bgreece\b/i, /\bgreek\b/i, /\bathens\b/i] },
  { key: "news.world", patterns: [/\bworld\b/i, /\bworldwide\b/i, /\bglobal\b/i, /\binternational\b/i] },
  { key: "tech.cs", patterns: [/\bcomputer science\b/i, /\bresearch\b/i, /\bpaper\b/i, /\bbenchmark\b/i] },
  { key: "tech.programming", patterns: [/\bprogramming\b/i, /\blanguage\b/i, /\bcompiler\b/i, /\btypescript\b/i, /\bpython\b/i] },
  { key: "tech.ai_llm", patterns: [/\bai\b/i, /\bllm\b/i, /\bmodel\b/i, /\binference\b/i, /\bprompt\b/i] },
  { key: "tech.other", patterns: [/\bengineering\b/i, /\bplatform\b/i, /\binfrastructure\b/i, /\bdevops\b/i, /\barchitecture\b/i] }
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function classifySentence(sentence: string, fallback: TargetKey): TargetKey {
  const matched = TARGET_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(sentence)));
  return matched?.key ?? fallback;
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
    .slice(0, 6);
}

function toSourceLinks(sourceNames: string[]): Array<{ title: string; url: string; publisher?: string }> {
  return sourceNames.map((name) => ({
    title: name,
    publisher: name,
    url: `https://www.google.com/search?q=${encodeURIComponent(name)}`
  }));
}

function pushToSection(issue: DailyIssue, key: TargetKey, item: BriefItem) {
  const [section, subsection] = key.split(".") as ["news" | "tech", string];
  const target = (issue.sections[section] as Record<string, Subsection>)[subsection];
  target.items.push(item);
}

function fillNarratives(issue: DailyIssue) {
  const setNarrative = (subsection: Subsection) => {
    if (subsection.items.length === 0) {
      subsection.narrative = "No major updates were captured for this subsection in the latest automation feed.";
      return;
    }

    const top = subsection.items.slice(0, 2).map((item) => item.headline).join("; ");
    subsection.narrative = `What happened: ${top}. Why it matters: this can change near-term priorities and execution timing. Watch: confirmation from primary sources and concrete next steps.`;
  };

  setNarrative(issue.sections.news.cyprus);
  setNarrative(issue.sections.news.greece);
  setNarrative(issue.sections.news.world);
  setNarrative(issue.sections.tech.cs);
  setNarrative(issue.sections.tech.programming);
  setNarrative(issue.sections.tech.ai_llm);
  setNarrative(issue.sections.tech.other);
}

function totalItems(issue: DailyIssue) {
  return [
    issue.sections.news.cyprus,
    issue.sections.news.greece,
    issue.sections.news.world,
    issue.sections.tech.cs,
    issue.sections.tech.programming,
    issue.sections.tech.ai_llm,
    issue.sections.tech.other
  ].reduce((acc, subsection) => acc + subsection.items.length, 0);
}

export function parseWithoutLLM(issue: DailyIssue, input: { newsText: string; techText: string }) {
  const newsSources = toSourceLinks(extractSourceNames(input.newsText));
  const techSources = toSourceLinks(extractSourceNames(input.techText));

  splitSentences(input.newsText)
    .filter((sentence) => !/^sources?:/i.test(sentence))
    .forEach((sentence) => {
      const key = classifySentence(sentence, "news.world");
      const safeKey: TargetKey = key.startsWith("news.") ? key : "news.world";
      pushToSection(issue, safeKey, buildItem(sentence, issue.sections.news[safeKey.split(".")[1] as keyof DailyIssue["sections"]["news"]].label, newsSources));
    });

  splitSentences(input.techText)
    .filter((sentence) => !/^sources?:/i.test(sentence))
    .forEach((sentence) => {
      const key = classifySentence(sentence, "tech.other");
      const safeKey: TargetKey = key.startsWith("tech.") ? key : "tech.other";
      pushToSection(issue, safeKey, buildItem(sentence, issue.sections.tech[safeKey.split(".")[1] as keyof DailyIssue["sections"]["tech"]].label, techSources));
    });

  fillNarratives(issue);
  issue.status = totalItems(issue) > 0 ? "ready" : "partial";
  return issue;
}
