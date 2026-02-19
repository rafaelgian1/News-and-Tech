"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AppLanguage, localizeSubsectionLabel, t } from "@/lib/i18n";
import { CoverBlock, Subsection } from "@/lib/types";

type Props = {
  issueDate: string;
  block: CoverBlock;
  subsectionKey: string;
  subsection: Subsection;
  search: string;
  language: AppLanguage;
};

type PdfCursor = {
  y: number;
};

function storageKey(issueDate: string, block: string, subsectionKey: string) {
  return `saved:${issueDate}:${block}:${subsectionKey}`;
}

function translationKey(issueDate: string, block: string, subsectionKey: string, language: AppLanguage) {
  return `tr:v3:${issueDate}:${block}:${subsectionKey}:${language}`;
}

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
      item.credibilityNotes ?? ""
    ])
  ]
    .join(" ")
    .trim();

  return sample.length > 0 && hasGreekChars(sample);
}

function hashText(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function articleImage(headline: string, block: CoverBlock) {
  const seed = hashText(`${block}:${headline}`);
  const hueBase = block === "news" ? 208 : 88;
  const hue = (hueBase + (seed % 36)) % 360;
  const hue2 = (hue + 28) % 360;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='620' viewBox='0 0 1200 620'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='hsl(${hue} 70% 45%)'/>
      <stop offset='100%' stop-color='hsl(${hue2} 72% 18%)'/>
    </linearGradient>
    <filter id='b'><feGaussianBlur stdDeviation='45'/></filter>
  </defs>
  <rect width='1200' height='620' fill='url(#g)'/>
  <circle cx='260' cy='180' r='150' fill='white' opacity='0.14' filter='url(#b)'/>
  <circle cx='960' cy='440' r='170' fill='white' opacity='0.1' filter='url(#b)'/>
  <rect x='120' y='140' width='960' height='340' rx='24' fill='black' opacity='0.16'/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function ensurePdfSpace(doc: { internal: { pageSize: { getHeight: () => number } }; addPage: () => void }, cursor: PdfCursor, needed = 14) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottom = 42;
  if (cursor.y + needed > pageHeight - bottom) {
    doc.addPage();
    cursor.y = 42;
  }
}

function writePdfParagraph(
  doc: {
    setFontSize: (size: number) => void;
    setFont: (family: string, style?: string) => void;
    splitTextToSize: (text: string, maxWidth: number) => string[];
    text: (text: string, x: number, y: number) => void;
    internal: { pageSize: { getHeight: () => number } };
    addPage: () => void;
  },
  text: string,
  cursor: PdfCursor,
  options: { x: number; maxWidth: number; size?: number; bold?: boolean; lineGap?: number } = { x: 42, maxWidth: 500 }
) {
  if (!text.trim()) {
    return;
  }

  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(options.size ?? 11);

  const lineGap = options.lineGap ?? 14;
  const lines = doc.splitTextToSize(text, options.maxWidth);

  lines.forEach((line) => {
    ensurePdfSpace(doc, cursor, lineGap);
    doc.text(line, options.x, cursor.y);
    cursor.y += lineGap;
  });

  cursor.y += 4;
}

function asFileToken(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function SubsectionAccordion({ issueDate, block, subsectionKey, subsection, search, language }: Props) {
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [translatedSubsection, setTranslatedSubsection] = useState<Subsection | null>(null);
  const [translationError, setTranslationError] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const key = storageKey(issueDate, block, subsectionKey);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSaved(window.localStorage.getItem(key) === "1");
  }, [key]);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (language === "en") {
      setTranslatedSubsection(null);
      setTranslationError(false);
      return;
    }

    if (!open) {
      return;
    }

    const localKey = translationKey(issueDate, block, subsectionKey, language);
    const cached = window.localStorage.getItem(localKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Subsection;
        if (!subsectionLooksGreek(parsed)) {
          window.localStorage.removeItem(localKey);
          throw new Error("cached translation not greek");
        }

        setTranslatedSubsection(parsed);
        setTranslationError(false);
        return;
      } catch {
        // continue with server translation
      }
    }

    const run = async () => {
      setIsTranslating(true);
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLang: language, subsection })
        });

        if (!response.ok) {
          throw new Error("translation failed");
        }

        const payload = (await response.json()) as { subsection: Subsection };
        if (!subsectionLooksGreek(payload.subsection)) {
          throw new Error("translation not applied");
        }

        setTranslatedSubsection(payload.subsection);
        setTranslationError(false);
        window.localStorage.setItem(localKey, JSON.stringify(payload.subsection));
      } catch {
        setTranslationError(true);
        setTranslatedSubsection(null);
      } finally {
        setIsTranslating(false);
      }
    };

    void run();
  }, [language, open, issueDate, block, subsectionKey, subsection]);

  const activeSubsection = language === "en" ? subsection : translatedSubsection ?? subsection;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return activeSubsection.items;
    }

    return activeSubsection.items.filter((item) => {
      const haystack = [
        item.headline,
        ...item.keyFacts,
        item.analysis,
        ...item.implications,
        ...item.watchNext,
        item.credibilityNotes ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, activeSubsection.items]);

  const onSavePdf = async () => {
    const next = !saved;
    setSaved(next);

    if (typeof window !== "undefined") {
      if (next) {
        window.localStorage.setItem(key, "1");
      } else {
        window.localStorage.removeItem(key);
      }
    }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const left = 42;
      const maxWidth = doc.internal.pageSize.getWidth() - left * 2;
      const cursor: PdfCursor = { y: 42 };

      const displayLabel = localizeSubsectionLabel(activeSubsection.label, language);
      writePdfParagraph(doc, displayLabel, cursor, { x: left, maxWidth, size: 18, bold: true, lineGap: 22 });
      writePdfParagraph(doc, `${t(language, "appTitle")} - ${issueDate}`, cursor, {
        x: left,
        maxWidth,
        size: 10,
        lineGap: 13
      });

      if (activeSubsection.narrative) {
        writePdfParagraph(doc, `${t(language, "analysis")}: ${activeSubsection.narrative}`, cursor, {
          x: left,
          maxWidth,
          size: 11,
          lineGap: 14
        });
      }

      activeSubsection.items.forEach((item, index) => {
        if (index > 0) {
          cursor.y += 6;
        }

        writePdfParagraph(doc, item.headline, cursor, { x: left, maxWidth, size: 13, bold: true, lineGap: 17 });

        if (item.keyFacts.length > 0) {
          writePdfParagraph(doc, `${t(language, "keyFacts")}:`, cursor, { x: left, maxWidth, bold: true });
          item.keyFacts.forEach((fact) => {
            writePdfParagraph(doc, `- ${fact}`, cursor, { x: left + 8, maxWidth: maxWidth - 8 });
          });
        }

        writePdfParagraph(doc, item.analysis, cursor, { x: left, maxWidth });

        if (item.implications.length > 0) {
          writePdfParagraph(doc, `${t(language, "implications")}:`, cursor, { x: left, maxWidth, bold: true });
          item.implications.forEach((implication) => {
            writePdfParagraph(doc, `- ${implication}`, cursor, { x: left + 8, maxWidth: maxWidth - 8 });
          });
        }

        if (item.watchNext.length > 0) {
          writePdfParagraph(doc, `${t(language, "watchNext")}:`, cursor, { x: left, maxWidth, bold: true });
          item.watchNext.forEach((watch) => {
            writePdfParagraph(doc, `- ${watch}`, cursor, { x: left + 8, maxWidth: maxWidth - 8 });
          });
        }

        if (item.credibilityNotes) {
          writePdfParagraph(doc, `${t(language, "credibilityNote")}: ${item.credibilityNotes}`, cursor, {
            x: left,
            maxWidth
          });
        }

        if (item.sources.length > 0) {
          writePdfParagraph(doc, `${t(language, "sources")}:`, cursor, { x: left, maxWidth, bold: true });
          item.sources.forEach((source) => {
            const sourceLine = `${source.title}${source.publisher ? ` - ${source.publisher}` : ""}: ${source.url}`;
            writePdfParagraph(doc, `- ${sourceLine}`, cursor, { x: left + 8, maxWidth: maxWidth - 8 });
          });
        }
      });

      const fileName = `daily-brief-${issueDate}-${asFileToken(block)}-${asFileToken(subsectionKey)}.pdf`;
      doc.save(fileName);
    } catch {
      window.alert(t(language, "savePdfFailed"));
    }
  };

  const displayLabel = localizeSubsectionLabel(activeSubsection.label, language);

  return (
    <section className="subsection">
      <div className="subsection-top">
        <button type="button" className="topic-trigger" onClick={() => setOpen(true)}>
          <h4>{displayLabel}</h4>
          <p>
            {activeSubsection.readTimeMinutes ?? 1} {t(language, "minRead")} • {activeSubsection.items.length} {t(language, "updates")}
          </p>
        </button>
        <div className="subsection-actions">
          <button type="button" onClick={() => void onSavePdf()} className={clsx(saved && "active")} title={t(language, "savePdf")}>
            {t(language, "savePdf")}
          </button>
          <button type="button" onClick={() => setOpen(true)}>
            {t(language, "open")}
          </button>
        </div>
      </div>

      {search.trim().length > 0 && filteredItems.length === 0 ? <p className="muted">{t(language, "noMatching")}</p> : null}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${displayLabel} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3>{displayLabel}</h3>
                <p>{issueDate}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                {t(language, "close")}
              </button>
            </div>

            {isTranslating ? <p className="muted">{t(language, "translating")}</p> : null}
            {translationError && language !== "en" ? <p className="muted">{t(language, "translationUnavailable")}</p> : null}

            {activeSubsection.narrative ? <p className="narrative">{activeSubsection.narrative}</p> : null}

            {filteredItems.length === 0 ? (
              <p className="muted">{t(language, "noItems")}</p>
            ) : (
              filteredItems.map((item) => (
                <article key={`${displayLabel}-${item.headline}`} className="news-item">
                  <img src={articleImage(item.headline, block)} alt="Article visual" className="news-visual" />
                  <h5>{item.headline}</h5>

                  <div>
                    <strong>{t(language, "keyFacts")}</strong>
                    <ul>
                      {item.keyFacts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  <p>{item.analysis}</p>

                  <div>
                    <strong>{t(language, "implications")}</strong>
                    <ul>
                      {item.implications.map((implication) => (
                        <li key={implication}>{implication}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong>{t(language, "watchNext")}</strong>
                    <ul>
                      {item.watchNext.map((watch) => (
                        <li key={watch}>{watch}</li>
                      ))}
                    </ul>
                  </div>

                  {item.credibilityNotes ? (
                    <p className="credibility">
                      {t(language, "credibilityNote")}: {item.credibilityNotes}
                    </p>
                  ) : null}

                  <div className="sources">
                    <strong>{t(language, "sources")}</strong>
                    <ul>
                      {item.sources.map((source) => (
                        <li key={`${source.url}-${source.title}`}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                          {source.publisher ? <span> · {source.publisher}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
