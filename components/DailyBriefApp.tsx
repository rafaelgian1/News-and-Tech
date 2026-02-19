"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BlockCard } from "@/components/BlockCard";
import { EmptyState } from "@/components/EmptyState";
import { formatHumanDate } from "@/lib/date";
import { AppLanguage, LANGUAGE_OPTIONS, localeForLanguage, t } from "@/lib/i18n";
import { DailyIssue } from "@/lib/types";

type Props = {
  selectedDate: string;
  issue: DailyIssue | null;
  quickDays: string[];
  requestedDateFound: boolean;
};

export function DailyBriefApp({ selectedDate, issue, quickDays, requestedDateFound }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showNews, setShowNews] = useState(true);
  const [showTech, setShowTech] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<AppLanguage>("en");

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
        <button type="button" onClick={() => setShowNews((v) => !v)} className={showNews ? "active" : ""}>
          {t(language, "news")}
        </button>
        <button type="button" onClick={() => setShowTech((v) => !v)} className={showTech ? "active" : ""}>
          {t(language, "tech")}
        </button>
      </section>

      {!requestedDateFound && issue ? (
        <section className="fallback-note">
          <p>{t(language, "noIssueForDate", { selectedDate, issueDate: issue.date })}</p>
        </section>
      ) : null}

      {!issue ? (
        <EmptyState date={selectedDate} language={language} />
      ) : (
        <section className="block-grid">
          <BlockCard issue={issue} block="news" title={t(language, "news")} search={search} visible={showNews} language={language} />
          <BlockCard issue={issue} block="tech" title={t(language, "tech")} search={search} visible={showTech} language={language} />
        </section>
      )}
    </main>
  );
}
