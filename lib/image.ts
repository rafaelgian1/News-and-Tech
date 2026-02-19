import { createHash } from "node:crypto";
import { callTextLLM } from "@/lib/llm";
import { promptC_coverPromptBuilder } from "@/lib/prompts";
import { CoverBlock } from "@/lib/types";

function hueFromText(input: string) {
  const hash = createHash("md5").update(input).digest("hex");
  return parseInt(hash.slice(0, 2), 16) % 360;
}

function fallbackAbstractSvg(prompt: string, block: CoverBlock) {
  const hue = hueFromText(`${block}:${prompt}`);
  const secondary = (hue + 70) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='hsl(${hue} 72% 52%)'/>
      <stop offset='100%' stop-color='hsl(${secondary} 82% 22%)'/>
    </linearGradient>
    <filter id='blur'><feGaussianBlur stdDeviation='75'/></filter>
  </defs>
  <rect width='1600' height='900' fill='url(#g)'/>
  <circle cx='380' cy='250' r='200' fill='white' opacity='0.12' filter='url(#blur)'/>
  <circle cx='1180' cy='610' r='250' fill='white' opacity='0.1' filter='url(#blur)'/>
  <rect x='180' y='190' width='1240' height='520' rx='38' fill='black' opacity='0.16'/>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function createCoverAsset(input: {
  date: string;
  block: CoverBlock;
  topKeywords: string[];
}): Promise<{ prompt: string; imageUrl: string }> {
  let prompt = `${input.block} cover on ${input.date}: ${input.topKeywords.join(", ")}; minimal high-contrast abstract editorial style, no text.`;

  try {
    const generated = await callTextLLM(
      promptC_coverPromptBuilder({
        date: input.date,
        block: input.block,
        topKeywords: input.topKeywords
      })
    );

    if (generated) {
      prompt = generated;
    }
  } catch {
    // Prompt fallback is good enough for MVP.
  }

  const externalImageEndpoint = process.env.IMAGE_GEN_ENDPOINT;
  if (externalImageEndpoint) {
    try {
      const response = await fetch(externalImageEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.IMAGE_GEN_API_KEY
            ? { Authorization: `Bearer ${process.env.IMAGE_GEN_API_KEY}` }
            : {})
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const payload = (await response.json()) as { imageUrl?: string };
        if (payload.imageUrl) {
          return { prompt, imageUrl: payload.imageUrl };
        }
      }
    } catch {
      // External image generation is optional for MVP.
    }
  }

  return {
    prompt,
    imageUrl: fallbackAbstractSvg(prompt, input.block)
  };
}
