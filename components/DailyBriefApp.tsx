"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BlockCard } from "@/components/BlockCard";
import { EmptyState } from "@/components/EmptyState";
import { formatHumanDate } from "@/lib/date";
import { AppLanguage, LANGUAGE_OPTIONS, localeForLanguage, t } from "@/lib/i18n";
import { SECTION_ORDER, sectionTitleKey } from "@/lib/sections";
import { CoverBlock, DailyIssue } from "@/lib/types";

type Props = {
  selectedDate: string;
  issue: DailyIssue | null;
  quickDays: string[];
  requestedDateFound: boolean;
};

function initialVisibility() {
  return SECTION_ORDER.reduce(
    (acc, block) => {
      acc[block] = true;
      return acc;
    },
    {} as Record<CoverBlock, boolean>
  );
}

export function DailyBriefApp({ selectedDate, issue, quickDays, requestedDateFound }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [visibleBlocks, setVisibleBlocks] = useState<Record<CoverBlock, boolean>>(initialVisibility);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [isIngestingSelectedDate, setIsIngestingSelectedDate] = useState(false);
  const [ingestError, setIngestError] = useState("");

  const [showManualIngest, setShowManualIngest] = useState(false);
  const [manualNewsText, setManualNewsText] = useState("");
  const [manualTechText, setManualTechText] = useState("");
  const [manualSportsText, setManualSportsText] = useState("");
  const [manualError, setManualError] = useState("");
  const [isManualIngesting, setIsManualIngesting] = useState(false);

  const pageTitle = useMemo(() => formatHumanDate(selectedDate, localeForLanguage(language)), [selectedDate, language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem("daily-brief-theme");
    const nextTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);

    const storedLang = window.localStorage.getItem("daily-brief-language");
    if (storedLang === "el" || storedLang === "en") {
      setLanguage(storedLang);
    }
  }, []);

  const onDateChange = (date: string) => {
    router.push(`/?date=${date}`);
  };

  const onThemeToggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("daily-brief-theme", next);
  };

  const onLanguageChange = (next: AppLanguage) => {
    setLanguage(next);
    window.localStorage.setItem("daily-brief-language", next);
  };

  const toggleBlock = (block: CoverBlock) => {
    setVisibleBlocks((prev) => ({
      ...prev,
      [block]: !prev[block]
    }));
  };

  const ingestSelectedDayNow = async () => {
    setIngestError("");
    setIsIngestingSelectedDate(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate })
      });

      if (!response.ok) {
        let detail = "";
        try {
          const payload = (await response.json()) as { error?: string; detail?: string };
          detail = payload.error ?? payload.detail ?? "";
        } catch {
          // ignore json parsing errors
        }

        setIngestError(detail ? `${t(language, "ingestFailed")} (${detail})` : t(language, "ingestFailed"));
        return;
      }

      window.location.href = `/?date=${selectedDate}`;
    } catch {
      setIngestError(t(language, "ingestFailed"));
    } finally {
      setIsIngestingSelectedDate(false);
    }
  };

  const openManualIngest = () => {
    setManualError("");
    setShowManualIngest(true);
  };

  const closeManualIngest = () => {
    if (isManualIngesting) {
      return;
    }
    setShowManualIngest(false);
  };

  const submitManualIngest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualError("");

    if (!manualNewsText.trim() && !manualTechText.trim() && !manualSportsText.trim()) {
      setManualError(t(language, "manualIngestNeedInput"));
      return;
    }

    setIsManualIngesting(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          newsText: manualNewsText,
          techText: manualTechText,
          sportsText: manualSportsText
        })
      });

      if (!response.ok) {
        let detail = "";
        try {
          const payload = (await response.json()) as { error?: string; detail?: string };
          detail = payload.error ?? payload.detail ?? "";
        } catch {
          // ignore json parsing errors
        }

        setManualError(detail ? `${t(language, "ingestFailed")} (${detail})` : t(language, "ingestFailed"));
        return;
      }

      window.location.href = `/?date=${selectedDate}`;
    } catch {
      setManualError(t(language, "ingestFailed"));
    } finally {
      setIsManualIngesting(false);
    }
  };

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t(language, "appTitle")}</p>
          <h1>{pageTitle}</h1>
        </div>

        <div className="header-controls">
          <input
            aria-label={t(language, "selectDate")}
            type="date"
            value={selectedDate}
            max={quickDays[0]}
            onChange={(event) => onDateChange(event.target.value)}
          />
          <input
            aria-label={t(language, "searchBrief")}
            type="search"
            placeholder={t(language, "searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label={t(language, "language")}
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as AppLanguage)}
            className="lang-select"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={openManualIngest}>
            {t(language, "manualIngest")}
          </button>
          <button type="button" onClick={onThemeToggle}>
            {theme === "light" ? t(language, "themeDark") : t(language, "themeLight")}
          </button>
          <Link href="/archive">{t(language, "archive")}</Link>
        </div>
      </header>

      <section className="quick-days" aria-label={t(language, "last7Days")}>
        {quickDays.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onDateChange(day)}
            className={day === selectedDate ? "active" : ""}
          >
            {day.slice(5)}
          </button>
        ))}
      </section>

      <section className="quick-filters">
        {SECTION_ORDER.map((block) => (
          <button type="button" key={block} onClick={() => toggleBlock(block)} className={visibleBlocks[block] ? "active" : ""}>
            {t(language, sectionTitleKey(block))}
          </button>
        ))}
      </section>

      {!requestedDateFound && issue ? (
        <section className="fallback-note">
          <div className="fallback-note-row">
            <p>{t(language, "noIssueForDate", { selectedDate, issueDate: issue.date })}</p>
            <button type="button" onClick={() => void ingestSelectedDayNow()} disabled={isIngestingSelectedDate}>
              {isIngestingSelectedDate ? t(language, "ingestingDay") : t(language, "ingestSelectedDay")}
            </button>
          </div>
          {ingestError ? <p className="fallback-error">{ingestError}</p> : null}
        </section>
      ) : null}

      {!issue ? (
        <EmptyState date={selectedDate} language={language} />
      ) : (
        <section className="block-grid">
          {SECTION_ORDER.map((block) => (
            <BlockCard
              key={block}
              issue={issue}
              block={block}
              title={t(language, sectionTitleKey(block))}
              search={search}
              visible={visibleBlocks[block]}
              language={language}
            />
          ))}
        </section>
      )}

      {showManualIngest ? (
        <div className="modal-backdrop" role="presentation" onClick={closeManualIngest}>
          <div className="modal-sheet manual-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{t(language, "manualIngestTitle")}</h3>
                <p>{t(language, "manualIngestSubtitle", { date: selectedDate })}</p>
              </div>
              <button type="button" onClick={closeManualIngest} disabled={isManualIngesting}>
                {t(language, "close")}
              </button>
            </div>

            <form className="manual-ingest-form" onSubmit={submitManualIngest}>
              <div className="manual-date-pill">
                <span>{t(language, "manualIngestForDate")}</span>
                <strong>{selectedDate}</strong>
              </div>

              <div className="manual-grid">
                <label className="manual-field">
                  <span>{t(language, "manualNewsLabel")}</span>
                  <textarea
                    className="manual-textarea"
                    value={manualNewsText}
                    onChange={(event) => setManualNewsText(event.target.value)}
                    placeholder={t(language, "manualNewsPlaceholder")}
                  />
                </label>

                <label className="manual-field">
                  <span>{t(language, "manualTechLabel")}</span>
                  <textarea
                    className="manual-textarea"
                    value={manualTechText}
                    onChange={(event) => setManualTechText(event.target.value)}
                    placeholder={t(language, "manualTechPlaceholder")}
                  />
                </label>

                <label className="manual-field manual-field-wide">
                  <span>{t(language, "manualSportsLabel")}</span>
                  <textarea
                    className="manual-textarea"
                    value={manualSportsText}
                    onChange={(event) => setManualSportsText(event.target.value)}
                    placeholder={t(language, "manualSportsPlaceholder")}
                  />
                </label>
              </div>

              {manualError ? <p className="fallback-error">{manualError}</p> : null}

              <div className="manual-actions">
                <button type="button" onClick={closeManualIngest} disabled={isManualIngesting}>
                  {t(language, "manualIngestCancel")}
                </button>
                <button type="submit" className="manual-primary" disabled={isManualIngesting}>
                  {isManualIngesting ? t(language, "manualIngestRunning") : t(language, "manualIngestSubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
