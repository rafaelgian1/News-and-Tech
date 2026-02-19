import Link from "next/link";
import { formatHumanDate } from "@/lib/date";
import { getArchiveWindow } from "@/lib/service";

export default async function ArchivePage() {
  const issues = await getArchiveWindow(180);

  return (
    <main className="archive-page">
      <header>
        <p className="eyebrow">Daily Brief Newspaper</p>
        <h1>Archive</h1>
        <Link href="/">Back to Home</Link>
      </header>

      {issues.length === 0 ? (
        <p className="muted">No archived issues yet. Issues older than 7 days will appear here automatically.</p>
      ) : (
        <ul className="archive-list">
          {issues.map((issue) => (
            <li key={issue.date}>
              <Link href={`/?date=${issue.date}`}>
                <strong>{formatHumanDate(issue.date)}</strong>
                <span>
                  {issue.sections.news.world.items[0]?.headline ?? issue.sections.tech.ai_llm.items[0]?.headline ?? "Open issue"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
