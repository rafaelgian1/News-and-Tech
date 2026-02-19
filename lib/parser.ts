import { parseWithoutLLM } from "@/lib/fallbackParser";
import { createEmptyIssue, listAllSubsections, normalizeIssue } from "@/lib/issueShape";
import { callJsonLLM } from "@/lib/llm";
import { promptA_automationToIssueJSON, promptB_issueToNarrative } from "@/lib/prompts";
import { SECTION_ORDER } from "@/lib/sections";
import { DailyIssue, IngestPayload, Subsection } from "@/lib/types";

function estimateReadTimeMinutes(subsection: Subsection) {
  const text = subsection.items
    .map((item) => [item.headline, ...item.keyFacts, item.analysis, ...item.implications, ...item.watchNext].join(" "))
    .join(" ");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function attachReadTimes(issue: DailyIssue): DailyIssue {
  const next = structuredClone(issue);
  listAllSubsections(next).forEach((subsection) => {
    subsection.readTimeMinutes = estimateReadTimeMinutes(subsection);
  });
  return next;
}

function attachNarratives(issue: DailyIssue, narrativeRaw: unknown) {
  if (!narrativeRaw || typeof narrativeRaw !== "object") {
    return issue;
  }

  const root = narrativeRaw as Record<string, unknown>;
  const sectionsRoot =
    root.sections && typeof root.sections === "object" ? (root.sections as Record<string, unknown>) : (root as Record<string, unknown>);

  SECTION_ORDER.forEach((block) => {
    const sectionTarget = issue.sections[block];
    const sectionNarrative =
      sectionsRoot[block] && typeof sectionsRoot[block] === "object"
        ? (sectionsRoot[block] as Record<string, unknown>)
        : undefined;

    if (!sectionNarrative) {
      return;
    }

    Object.entries(sectionTarget).forEach(([subsectionKey, subsection]) => {
      const row = sectionNarrative[subsectionKey];
      if (!row || typeof row !== "object") {
        return;
      }

      const value = row as Record<string, unknown>;
      if (typeof value.narrative === "string") {
        subsection.narrative = value.narrative;
      }
    });
  });

  return issue;
}

export async function parseAutomationPayload(payload: IngestPayload): Promise<DailyIssue> {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const empty = createEmptyIssue(date);

  const newsText = payload.newsText ?? "";
  const techText = payload.techText ?? "";
  const sportsText = payload.sportsText ?? "";

  if (!newsText.trim() && !techText.trim() && !sportsText.trim()) {
    return empty;
  }

  let parsed = empty;
  let usedFallback = false;

  try {
    const raw = await callJsonLLM(
      promptA_automationToIssueJSON({
        date,
        newsText,
        techText,
        sportsText
      })
    );

    parsed = normalizeIssue(raw, date);
  } catch {
    parsed = parseWithoutLLM(parsed, {
      newsText,
      techText,
      sportsText
    });
    usedFallback = true;
  }

  if (!usedFallback) {
    try {
      const narrative = await callJsonLLM(promptB_issueToNarrative(parsed));
      parsed = attachNarratives(parsed, narrative);
    } catch {
      parsed = parseWithoutLLM(parsed, {
        newsText,
        techText,
        sportsText
      });
    }
  }

  parsed.rawAutomationInput = `${newsText}\n\n${techText}\n\n${sportsText}`.trim();

  return attachReadTimes(parsed);
}
