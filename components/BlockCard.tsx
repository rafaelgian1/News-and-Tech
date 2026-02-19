"use client";

import { useMemo } from "react";
import { SubsectionAccordion } from "@/components/SubsectionAccordion";
import { AppLanguage, t } from "@/lib/i18n";
import { sectionFallbackCover, SECTION_BY_KEY } from "@/lib/sections";
import { CoverBlock, DailyIssue, Subsection } from "@/lib/types";

type Props = {
  issue: DailyIssue;
  block: CoverBlock;
  title: string;
  search: string;
  visible: boolean;
  language: AppLanguage;
};

function orderedSubsections(block: CoverBlock, sectionMap: Record<string, Subsection>) {
  const order = SECTION_BY_KEY[block].subsections.map((subsection) => subsection.key);
  const entries = Object.entries(sectionMap);

  entries.sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);

    if (ia === -1 && ib === -1) {
      return a.localeCompare(b);
    }

    if (ia === -1) {
      return 1;
    }

    if (ib === -1) {
      return -1;
    }

    return ia - ib;
  });

  return entries;
}

function topHeadlines(subsections: Array<[string, Subsection]>) {
  return subsections
    .flatMap(([, subsection]) => subsection.items.map((item) => item.headline))
    .slice(0, 4);
}

export function BlockCard({ issue, block, title, search, visible, language }: Props) {
  const subsectionEntries = useMemo(() => orderedSubsections(block, issue.sections[block] ?? {}), [block, issue.sections]);

  const strip = topHeadlines(subsectionEntries);
  const forcedTopicCover = block === "news" ? "/news.png" : block === "tech" ? "/tech.png" : undefined;
  const coverUrl = forcedTopicCover ?? issue.covers?.[block]?.imageUrl ?? sectionFallbackCover(block);

  if (!visible) {
    return null;
  }

  return (
    <section className="block-card">
      <div className="cover-wrap">
        {coverUrl ? (
          <img src={coverUrl} alt={`${title} cover for ${issue.date}`} className="cover-image" />
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
