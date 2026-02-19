import { DailyIssue } from "@/lib/types";

export function promptA_automationToIssueJSON(input: {
  date: string;
  newsText: string;
  techText: string;
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

TARGET JSON SCHEMA
{
  "date": "YYYY-MM-DD",
  "sections": {
    "news": {
      "cyprus": { "label": "Cyprus", "items": [BriefItem] },
      "greece": { "label": "Greece", "items": [BriefItem] },
      "world": { "label": "Worldwide", "items": [BriefItem] }
    },
    "tech": {
      "cs": { "label": "Computer Science", "items": [BriefItem] },
      "programming": { "label": "Programming", "items": [BriefItem] },
      "ai_llm": { "label": "AI/LLMs", "items": [BriefItem] },
      "other": { "label": "Engineering", "items": [BriefItem] }
    }
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
${input.techText}`;
}

export function promptB_issueToNarrative(input: DailyIssue) {
  return `You are writing a concise analytical daily newspaper.

TASK
Using the provided structured DailyIssue JSON, enrich each subsection with a "narrative" string that is more analytical than summary.

REQUIRED SHAPE
Return only JSON with this shape:
{
  "news": {
    "cyprus": { "narrative": "..." },
    "greece": { "narrative": "..." },
    "world": { "narrative": "..." }
  },
  "tech": {
    "cs": { "narrative": "..." },
    "programming": { "narrative": "..." },
    "ai_llm": { "narrative": "..." },
    "other": { "narrative": "..." }
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

export function promptC_coverPromptBuilder(input: {
  date: string;
  block: "news" | "tech";
  topKeywords: string[];
}) {
  const style =
    input.block === "news"
      ? "tasteful abstract editorial style, no photorealistic faces"
      : "modern minimal tech illustration style";

  return `Create an image-generation prompt for a Daily Brief cover image.

Constraints:
- Date context: ${input.date}
- Block: ${input.block}
- Top keywords: ${input.topKeywords.join(", ")}
- Visual style: ${style}
- Clean composition, high contrast, no text on image.
- Professional newspaper/Notion hybrid aesthetic.
- No logos, no watermarks.

Return one prompt sentence only.`;
}
