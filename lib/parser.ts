import { parseWithoutLLM } from "@/lib/fallbackParser";
import { callJsonLLM } from "@/lib/llm";
import { promptA_automationToIssueJSON, promptB_issueToNarrative } from "@/lib/prompts";
import { BriefItem, DailyIssue, IngestPayload, Subsection } from "@/lib/types";

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function estimateReadTimeMinutes(subsection: Subsection) {
  const text = subsection.items
    .map((item) => [item.headline, ...item.keyFacts, item.analysis, ...item.implications, ...item.watchNext].join(" "))
    .join(" ");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function attachReadTimes(issue: DailyIssue): DailyIssue {
  const next = structuredClone(issue);

  const subsectionList: Subsection[] = [
    next.sections.news.cyprus,
    next.sections.news.greece,
    next.sections.news.world,
    next.sections.tech.cs,
    next.sections.tech.programming,
    next.sections.tech.ai_llm,
    next.sections.tech.other
  ];

  subsectionList.forEach((s) => {
    s.readTimeMinutes = estimateReadTimeMinutes(s);
  });

  return next;
}

function sanitizeItems(input: unknown): BriefItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      headline: typeof item.headline === "string" ? item.headline : "Untitled update",
      keyFacts: safeArray<string>(item.keyFacts).filter((v): v is string => typeof v === "string"),
      analysis: typeof item.analysis === "string" ? item.analysis : "",
      implications: safeArray<string>(item.implications).filter((v): v is string => typeof v === "string"),
      watchNext: safeArray<string>(item.watchNext).filter((v): v is string => typeof v === "string"),
      credibilityNotes: typeof item.credibilityNotes === "string" ? item.credibilityNotes : undefined,
      sources: safeArray<Record<string, unknown>>(item.sources).reduce<Array<{ title: string; url: string; publisher?: string }>>(
        (acc, source) => {
          if (typeof source.url !== "string") {
            return acc;
          }

          acc.push({
            title: typeof source.title === "string" ? source.title : source.url,
            url: source.url,
            publisher: typeof source.publisher === "string" ? source.publisher : undefined
          });

          return acc;
        },
        []
      )
    }));
}

function emptySubsection(label: string): Subsection {
  return {
    label,
    items: []
  };
}

function buildEmptyIssue(date: string): DailyIssue {
  return {
    date,
    status: "missing",
    sections: {
      news: {
        cyprus: emptySubsection("Cyprus"),
        greece: emptySubsection("Greece"),
        world: emptySubsection("Worldwide")
      },
      tech: {
        cs: emptySubsection("Computer Science"),
        programming: emptySubsection("Programming"),
        ai_llm: emptySubsection("AI/LLMs"),
        other: emptySubsection("Engineering")
      }
    },
    covers: {
      news: {
        block: "news",
        imageUrl: "",
        prompt: "",
        keywords: []
      },
      tech: {
        block: "tech",
        imageUrl: "",
        prompt: "",
        keywords: []
      }
    }
  };
}

function normalizeIssue(raw: unknown, date: string): DailyIssue {
  const issue = buildEmptyIssue(date);
  if (!raw || typeof raw !== "object") {
    return issue;
  }

  const obj = raw as Record<string, unknown>;
  issue.status = (obj.status as DailyIssue["status"]) ?? "partial";

  const sections = (obj.sections ?? {}) as Record<string, unknown>;
  const news = (sections.news ?? {}) as Record<string, unknown>;
  const tech = (sections.tech ?? {}) as Record<string, unknown>;

  const inject = (target: Subsection, value: unknown) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const v = value as Record<string, unknown>;
    target.label = typeof v.label === "string" ? v.label : target.label;
    target.items = sanitizeItems(v.items);
    target.narrative = typeof v.narrative === "string" ? v.narrative : target.narrative;
  };

  inject(issue.sections.news.cyprus, news.cyprus);
  inject(issue.sections.news.greece, news.greece);
  inject(issue.sections.news.world, news.world);

  inject(issue.sections.tech.cs, tech.cs);
  inject(issue.sections.tech.programming, tech.programming);
  inject(issue.sections.tech.ai_llm, tech.ai_llm);
  inject(issue.sections.tech.other, tech.other);

  return issue;
}

export async function parseAutomationPayload(payload: IngestPayload): Promise<DailyIssue> {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const empty = buildEmptyIssue(date);

  if (!payload.newsText.trim() && !payload.techText.trim()) {
    return empty;
  }

  let parsed = empty;
  let usedFallback = false;

  try {
    const raw = await callJsonLLM(
      promptA_automationToIssueJSON({
        date,
        newsText: payload.newsText,
        techText: payload.techText
      })
    );

    parsed = normalizeIssue(raw, date);
  } catch {
    parsed = parseWithoutLLM(parsed, {
      newsText: payload.newsText,
      techText: payload.techText
    });
    usedFallback = true;
  }

  if (!usedFallback) {
    try {
      const narrative = (await callJsonLLM(promptB_issueToNarrative(parsed))) as {
        news?: Record<string, { narrative?: string }>;
        tech?: Record<string, { narrative?: string }>;
      };

      const setNarrative = (subsection: Subsection, value?: { narrative?: string }) => {
        if (value?.narrative) {
          subsection.narrative = value.narrative;
        }
      };

      setNarrative(parsed.sections.news.cyprus, narrative.news?.cyprus);
      setNarrative(parsed.sections.news.greece, narrative.news?.greece);
      setNarrative(parsed.sections.news.world, narrative.news?.world);
      setNarrative(parsed.sections.tech.cs, narrative.tech?.cs);
      setNarrative(parsed.sections.tech.programming, narrative.tech?.programming);
      setNarrative(parsed.sections.tech.ai_llm, narrative.tech?.ai_llm);
      setNarrative(parsed.sections.tech.other, narrative.tech?.other);
    } catch {
      parsed = parseWithoutLLM(parsed, {
        newsText: payload.newsText,
        techText: payload.techText
      });
    }
  }

  parsed.rawAutomationInput = `${payload.newsText}\n\n${payload.techText}`;

  return attachReadTimes(parsed);
}
