import { SECTION_BY_KEY, SECTION_DEFINITIONS } from "@/lib/sections";
import { BriefItem, CoverBlock, CoverImage, DailyIssue, SectionSet, SourceLink, Subsection } from "@/lib/types";

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sanitizeSources(input: unknown): SourceLink[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<SourceLink[]>((acc, source) => {
    if (!source || typeof source !== "object") {
      return acc;
    }

    const row = source as Record<string, unknown>;
    if (typeof row.url !== "string") {
      return acc;
    }

    acc.push({
      title: typeof row.title === "string" ? row.title : row.url,
      url: row.url,
      publisher: typeof row.publisher === "string" ? row.publisher : undefined
    });

    return acc;
  }, []);
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
      sources: sanitizeSources(item.sources)
    }));
}

function emptySubsection(label: string): Subsection {
  return {
    label,
    items: []
  };
}

export function createEmptySections(): SectionSet {
  const sections = {} as SectionSet;

  SECTION_DEFINITIONS.forEach((section) => {
    const subsectionMap: Record<string, Subsection> = {};
    section.subsections.forEach((subsection) => {
      subsectionMap[subsection.key] = emptySubsection(subsection.label);
    });
    sections[section.key] = subsectionMap;
  });

  return sections;
}

export function createEmptyCovers(): Record<CoverBlock, CoverImage> {
  const covers = {} as Record<CoverBlock, CoverImage>;

  SECTION_DEFINITIONS.forEach((section) => {
    covers[section.key] = {
      block: section.key,
      imageUrl: "",
      prompt: "",
      keywords: []
    };
  });

  return covers;
}

function createAutoLabelFromKey(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function injectSubsection(target: Subsection, raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return;
  }

  const row = raw as Record<string, unknown>;
  target.label = typeof row.label === "string" ? row.label : target.label;
  target.items = sanitizeItems(row.items);
  target.narrative = typeof row.narrative === "string" ? row.narrative : target.narrative;
  target.readTimeMinutes = typeof row.readTimeMinutes === "number" ? row.readTimeMinutes : target.readTimeMinutes;
}

function normalizeStatus(value: unknown): DailyIssue["status"] {
  return value === "ready" || value === "partial" || value === "missing" ? value : "partial";
}

function normalizeCover(block: CoverBlock, raw: unknown, fallback: CoverImage): CoverImage {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const row = raw as Record<string, unknown>;

  return {
    block,
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : fallback.imageUrl,
    prompt: typeof row.prompt === "string" ? row.prompt : fallback.prompt,
    keywords: safeArray<string>(row.keywords).filter((value): value is string => typeof value === "string")
  };
}

export function createEmptyIssue(date: string): DailyIssue {
  return {
    date,
    status: "missing",
    sections: createEmptySections(),
    covers: createEmptyCovers()
  };
}

export function normalizeIssue(raw: unknown, dateFallback = new Date().toISOString().slice(0, 10)): DailyIssue {
  const base = createEmptyIssue(dateFallback);
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const root = raw as Record<string, unknown>;
  base.date = typeof root.date === "string" ? root.date : dateFallback;
  base.status = normalizeStatus(root.status);
  base.rawAutomationInput = typeof root.rawAutomationInput === "string" ? root.rawAutomationInput : undefined;
  base.createdAt = typeof root.createdAt === "string" ? root.createdAt : undefined;
  base.updatedAt = typeof root.updatedAt === "string" ? root.updatedAt : undefined;

  const sectionsRaw = root.sections && typeof root.sections === "object" ? (root.sections as Record<string, unknown>) : {};

  SECTION_DEFINITIONS.forEach((sectionDef) => {
    const targetSection = base.sections[sectionDef.key];
    const sectionRaw =
      sectionsRaw[sectionDef.key] && typeof sectionsRaw[sectionDef.key] === "object"
        ? (sectionsRaw[sectionDef.key] as Record<string, unknown>)
        : {};

    sectionDef.subsections.forEach((subsectionDef) => {
      injectSubsection(targetSection[subsectionDef.key], sectionRaw[subsectionDef.key]);
    });

    Object.entries(sectionRaw).forEach(([subsectionKey, subsectionValue]) => {
      if (targetSection[subsectionKey]) {
        return;
      }

      const dynamicSubsection = emptySubsection(createAutoLabelFromKey(subsectionKey));
      injectSubsection(dynamicSubsection, subsectionValue);
      targetSection[subsectionKey] = dynamicSubsection;
    });
  });

  const coversRaw = root.covers && typeof root.covers === "object" ? (root.covers as Record<string, unknown>) : {};

  const covers: Partial<Record<CoverBlock, CoverImage>> = {};
  const fallbackCovers = createEmptyCovers();
  (Object.keys(SECTION_BY_KEY) as CoverBlock[]).forEach((block) => {
    const fallback = fallbackCovers[block];
    covers[block] = normalizeCover(block, coversRaw[block], fallback);
  });

  base.covers = covers;

  return base;
}

export function listAllSubsections(issue: DailyIssue): Subsection[] {
  return SECTION_DEFINITIONS.flatMap((sectionDef) => Object.values(issue.sections[sectionDef.key] ?? {}));
}

export function listItemsForBlock(issue: DailyIssue, block: CoverBlock): BriefItem[] {
  return Object.values(issue.sections[block] ?? {}).flatMap((subsection) => subsection.items);
}

export function firstHeadline(issue: DailyIssue): string | null {
  for (const sectionDef of SECTION_DEFINITIONS) {
    for (const subsection of Object.values(issue.sections[sectionDef.key] ?? {})) {
      if (subsection.items[0]?.headline) {
        return subsection.items[0].headline;
      }
    }
  }

  return null;
}
