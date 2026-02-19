import { NextRequest, NextResponse } from "next/server";
import { callJsonLLM } from "@/lib/llm";
import { Subsection } from "@/lib/types";

type Body = {
  targetLang: "en" | "el";
  subsection: Subsection;
};

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

  const prompt = `Translate this subsection JSON to Greek while preserving structure and URLs exactly.

Rules:
- Return ONLY valid JSON matching the same schema.
- Translate label, narrative, headline, keyFacts, analysis, implications, watchNext, credibilityNotes, source title/publisher.
- Do not modify source URLs.
- Keep tone concise and editorially neutral.

INPUT JSON:
${JSON.stringify(body.subsection)}`;

  try {
    const translated = (await callJsonLLM(prompt)) as Subsection;
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
