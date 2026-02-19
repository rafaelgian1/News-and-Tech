export const dynamic = "force-dynamic";

import { DailyBriefApp } from "@/components/DailyBriefApp";
import { getTodayISO, rollingWindowDates } from "@/lib/date";
import { getIssueOrLatest } from "@/lib/service";

type PageProps = {
  searchParams: {
    date?: string | string[];
  };
};

export default async function HomePage({ searchParams }: PageProps) {
  const rawDate = searchParams.date;
  const selectedDate = Array.isArray(rawDate) ? rawDate[0] : rawDate ?? getTodayISO();
  const { issue, requestedDateFound } = await getIssueOrLatest(selectedDate);

  return (
    <DailyBriefApp
      selectedDate={selectedDate}
      issue={issue}
      quickDays={rollingWindowDates(7)}
      requestedDateFound={requestedDateFound}
    />
  );
}
