import { DailyIssue } from "@/lib/types";
import { SECTION_DEFINITIONS } from "@/lib/sections";

function issueSectionsSchemaExample() {
  return SECTION_DEFINITIONS.map((section) => {
    const subsectionLines = section.subsections
      .map((subsection) => `      "${subsection.key}": { "label": "${subsection.label}", "items": [BriefItem] }`)
      .join(",\n");

    return `    "${section.key}": {\n${subsectionLines}\n    }`;
  }).join(",\n");
}

function narrativeShapeExample() {
  return SECTION_DEFINITIONS.map((section) => {
    const subsectionLines = section.subsections
      .map((subsection) => `      "${subsection.key}": { "narrative": "..." }`)
      .join(",\n");

    return `    "${section.key}": {\n${subsectionLines}\n    }`;
  }).join(",\n");
}

export function promptA_automationToIssueJSON(input: {
  date: string;
  newsText: string;
  techText: string;
  sportsText: string;
}) {
  return `You are an editor-engine for a premium daily brief app.

TASK
Transform raw automation text into STRICT JSON for one DailyIssue.

DATE
${input.date}

OUTPUT RULES
- Return ONLY valid JSON. No markdown, no commentary.
- Keep facts grounded in the input. Do not invent claims.
- If data is missing, leave fields empty arrays or use concise uncertainty notes.
- Preserve citations where possible.
- For match_center entries, include Athens time (Europe/Athens) for upcoming fixtures.
- For matches already completed on the selected date, include final score/result in key facts.

TARGET JSON SCHEMA
{
  "date": "YYYY-MM-DD",
  "sections": {
${issueSectionsSchemaExample()}
  },
  "status": "ready|partial|missing"
}

BriefItem schema:
{
  "headline": "string",
  "keyFacts": ["fact 1", "fact 2"],
  "analysis": "short analytical paragraph",
  "implications": ["practical implication 1", "practical implication 2"],
  "watchNext": ["near-term watchpoint 1", "near-term watchpoint 2"],
  "credibilityNotes": "string or empty",
  "sources": [{"title":"string","url":"https://...","publisher":"string"}]
}

SOURCE MATERIAL - NEWS
${input.newsText}

SOURCE MATERIAL - TECH
${input.techText}

SOURCE MATERIAL - SPORTS
${input.sportsText}`;
}

export function promptB_issueToNarrative(input: DailyIssue) {
  return `You are writing a concise analytical daily newspaper.

TASK
Using the provided structured DailyIssue JSON, enrich each subsection with a "narrative" string that is more analytical than summary.

REQUIRED SHAPE
Return only JSON with this shape:
{
  "sections": {
${narrativeShapeExample()}
  }
}

Narrative requirements per subsection:
- Start with what happened (facts only).
- Explain why it matters now.
- Include 2-4 practical implications.
- Include what to watch in the near term.
- Mention credibility gaps if sources disagree.
- Keep it concise, scannable, and editorially neutral.

INPUT JSON
${JSON.stringify(input)}`;
}

function coverStyle(block: string) {
  if (block === "news") {
    return "tasteful abstract editorial style, no photorealistic faces";
  }

  if (block === "tech") {
    return "modern minimal tech illustration style";
  }

  if (block === "match_center" || block === "euroleague") {
    return "clean high-contrast sports broadcast infographic style, minimal, no logos";
  }

  return "premium newspaper sports illustration style, dynamic but clean, no text";
}

export function promptC_coverPromptBuilder(input: {
  date: string;
  block: string;
  topKeywords: string[];
}) {
  return `Create an image-generation prompt for a Daily Brief cover image.

Constraints:
- Date context: ${input.date}
- Block: ${input.block}
- Top keywords: ${input.topKeywords.join(", ")}
- Visual style: ${coverStyle(input.block)}
- Clean composition, high contrast, no text on image.
- Professional newspaper/Notion hybrid aesthetic.
- No logos, no watermarks.

Return one prompt sentence only.`;
}
