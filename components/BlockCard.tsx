"use client";

import { useMemo } from "react";
import { SubsectionAccordion } from "@/components/SubsectionAccordion";
import { AppLanguage, t } from "@/lib/i18n";
import { CoverBlock, DailyIssue, Subsection } from "@/lib/types";

type Props = {
  issue: DailyIssue;
  block: CoverBlock;
  title: string;
  search: string;
  visible: boolean;
  language: AppLanguage;
};

function topHeadlines(subsections: Array<[string, Subsection]>) {
  return subsections
    .flatMap(([, subsection]) => subsection.items.map((item) => item.headline))
    .slice(0, 4);
}

export function BlockCard({ issue, block, title, search, visible, language }: Props) {
  const subsectionEntries = useMemo(() => {
    if (block === "news") {
      return Object.entries(issue.sections.news) as Array<[string, Subsection]>;
    }
    return Object.entries(issue.sections.tech) as Array<[string, Subsection]>;
  }, [block, issue.sections.news, issue.sections.tech]);

  const cover = issue.covers[block];
  const strip = topHeadlines(subsectionEntries);

  if (!visible) {
    return null;
  }

  return (
    <section className="block-card">
      <div className="cover-wrap">
        {cover.imageUrl ? (
          <img src={cover.imageUrl} alt={`${title} cover for ${issue.date}`} className="cover-image" />
        ) : (
          <div className="cover-fallback">{t(language, "coverPending")}</div>
        )}
      </div>

      <div className="block-content">
        <div className="block-heading">
          <h2>{title}</h2>
          <p>{issue.date}</p>
        </div>

        <div className="headline-strip" aria-label={`${title} headline strip`}>
          {strip.length === 0 ? <span>{t(language, "noHeadlines")}</span> : strip.map((headline) => <span key={headline}>{headline}</span>)}
        </div>

        <div className="accordion-list">
          {subsectionEntries.map(([key, subsection]) => (
            <SubsectionAccordion
              key={`${block}-${key}`}
              issueDate={issue.date}
              block={block}
              subsectionKey={key}
              subsection={subsection}
              search={search}
              language={language}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
