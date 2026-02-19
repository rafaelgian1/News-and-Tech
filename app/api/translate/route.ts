import { NextRequest, NextResponse } from "next/server";
import { callJsonLLM } from "@/lib/llm";
import { Subsection } from "@/lib/types";

type Body = {
  targetLang: "en" | "el";
  subsection: Subsection;
};

function hasGreekChars(value: string) {
  return /[\u0370-\u03FF]/.test(value);
}

function subsectionLooksGreek(subsection: Subsection) {
  const sample = [
    subsection.label,
    subsection.narrative ?? "",
    ...subsection.items.flatMap((item) => [
      item.headline,
      ...item.keyFacts,
      item.analysis,
      ...item.implications,
      ...item.watchNext,
      item.credibilityNotes ?? "",
      ...item.sources.flatMap((source) => [source.title, source.publisher ?? ""])
    ])
  ]
    .join(" ")
    .trim();

  return sample.length > 0 && hasGreekChars(sample);
}

function translationPrompt(subsection: Subsection, strict: boolean) {
  return `Translate this subsection JSON to Greek while preserving structure and URLs exactly.

Output rules:
- Return ONLY valid JSON with the exact same schema.
- Translate ALL translatable text fields to Greek:
  label, narrative, headline, keyFacts, analysis, implications, watchNext, credibilityNotes, source title/publisher.
- Do NOT change source URLs.
- Keep concise editorial tone.
${strict ? "- IMPORTANT: Output must be Greek text (except proper nouns/URLs). Avoid leaving English sentences untranslated." : ""}

INPUT JSON:
${JSON.stringify(subsection)}`;
}

export async function POST(request: NextRequest) {
  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.subsection || !body?.targetLang) {
    return NextResponse.json({ error: "Missing fields: targetLang, subsection" }, { status: 400 });
  }

  if (body.targetLang === "en") {
    return NextResponse.json({ subsection: body.subsection });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Translation service unavailable" }, { status: 503 });
  }

  try {
    let translated = (await callJsonLLM(translationPrompt(body.subsection, false))) as Subsection;

    if (!subsectionLooksGreek(translated)) {
      translated = (await callJsonLLM(translationPrompt(body.subsection, true))) as Subsection;
    }

    if (!subsectionLooksGreek(translated)) {
      return NextResponse.json({ error: "Translation not applied" }, { status: 422 });
    }

    return NextResponse.json({ subsection: translated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Translation failed",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
