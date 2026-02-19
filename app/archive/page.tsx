export const dynamic = "force-dynamic";

import Link from "next/link";
import { formatHumanDate } from "@/lib/date";
import { firstHeadline } from "@/lib/issueShape";
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
                <span>{firstHeadline(issue) ?? "Open issue"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
