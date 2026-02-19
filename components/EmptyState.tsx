"use client";

import { AppLanguage, t } from "@/lib/i18n";

type Props = {
  date: string;
  language: AppLanguage;
};

export function EmptyState({ date, language }: Props) {
  const retry = async () => {
    await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date })
    });

    window.location.reload();
  };

  return (
    <section className="empty-state">
      <h2>{t(language, "noBriefForDate", { date })}</h2>
      <p>{t(language, "feedMissing")}</p>
      <button type="button" onClick={() => void retry()}>
        {t(language, "retryIngestion")}
      </button>
    </section>
  );
}
