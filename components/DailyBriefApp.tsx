"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    </main>
  );
}
