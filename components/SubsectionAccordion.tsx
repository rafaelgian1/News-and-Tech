"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AppLanguage, localizeSubsectionLabel, t } from "@/lib/i18n";
import { Subsection } from "@/lib/types";

type Props = {
  issueDate: string;
  block: "news" | "tech";
  subsectionKey: string;
  subsection: Subsection;
  search: string;
  language: AppLanguage;
};

function storageKey(issueDate: string, block: string, subsectionKey: string) {
  return `saved:${issueDate}:${block}:${subsectionKey}`;
}

function translationKey(issueDate: string, block: string, subsectionKey: string, language: AppLanguage) {
  return `tr:${issueDate}:${block}:${subsectionKey}:${language}`;
}

function hashText(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function articleImage(headline: string, block: "news" | "tech") {
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

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function subsectionToHtml(subsection: Subsection, issueDate: string, language: AppLanguage) {
  const itemsHtml = subsection.items
    .map((item) => {
      const keyFacts = item.keyFacts.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
      const implications = item.implications.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
      const watch = item.watchNext.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
      const sources = item.sources
        .map((s) => `<li><a href='${escapeHtml(s.url)}'>${escapeHtml(s.title)}</a>${s.publisher ? ` - ${escapeHtml(s.publisher)}` : ""}</li>`)
        .join("");

      return `<section style='margin:0 0 24px'>
        <h3 style='margin:0 0 8px'>${escapeHtml(item.headline)}</h3>
        <p><strong>${escapeHtml(t(language, "keyFacts"))}</strong></p><ul>${keyFacts}</ul>
        <p>${escapeHtml(item.analysis)}</p>
        <p><strong>${escapeHtml(t(language, "implications"))}</strong></p><ul>${implications}</ul>
        <p><strong>${escapeHtml(t(language, "watchNext"))}</strong></p><ul>${watch}</ul>
        ${item.credibilityNotes ? `<p><strong>${escapeHtml(t(language, "credibilityNote"))}:</strong> ${escapeHtml(item.credibilityNotes)}</p>` : ""}
        <p><strong>${escapeHtml(t(language, "sources"))}</strong></p><ul>${sources}</ul>
      </section>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset='utf-8'/><title>${escapeHtml(localizeSubsectionLabel(subsection.label, language))} - ${issueDate}</title></head>
  <body style='font-family: -apple-system, Segoe UI, Arial, sans-serif; padding: 28px; line-height: 1.45;'>
    <h1 style='margin:0 0 4px'>${escapeHtml(localizeSubsectionLabel(subsection.label, language))}</h1>
    <p style='margin:0 0 20px; color:#444'>${escapeHtml(t(language, "appTitle"))} - ${issueDate}</p>
    ${subsection.narrative ? `<p><strong>${escapeHtml(t(language, "analysis"))}</strong>: ${escapeHtml(subsection.narrative)}</p>` : ""}
    ${itemsHtml || `<p>${escapeHtml(t(language, "noItems"))}</p>`}
  </body></html>`;
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
        setTranslatedSubsection(JSON.parse(cached) as Subsection);
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

  const onSavePdf = () => {
    const next = !saved;
    setSaved(next);

    if (typeof window !== "undefined") {
      if (next) {
        window.localStorage.setItem(key, "1");
      } else {
        window.localStorage.removeItem(key);
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=860");
      if (!printWindow) {
        return;
      }

      printWindow.document.open();
      printWindow.document.write(subsectionToHtml(activeSubsection, issueDate, language));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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
          <button type="button" onClick={onSavePdf} className={clsx(saved && "active")} title={t(language, "savePdf")}>
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
