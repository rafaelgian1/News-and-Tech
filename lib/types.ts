export type SourceLink = {
  title: string;
  url: string;
  publisher?: string;
};

export type BriefItem = {
  headline: string;
  keyFacts: string[];
  analysis: string;
  implications: string[];
  watchNext: string[];
  credibilityNotes?: string;
  sources: SourceLink[];
};

export type Subsection = {
  label: string;
  items: BriefItem[];
  narrative?: string;
  readTimeMinutes?: number;
};

export type SectionSet = {
  news: {
    cyprus: Subsection;
    greece: Subsection;
    world: Subsection;
  };
  tech: {
    cs: Subsection;
    programming: Subsection;
    ai_llm: Subsection;
    other: Subsection;
  };
};

export type CoverBlock = "news" | "tech";

export type CoverImage = {
  block: CoverBlock;
  imageUrl: string;
  prompt: string;
  keywords: string[];
};

export type DailyIssue = {
  date: string;
  sections: SectionSet;
  covers: {
    news: CoverImage;
    tech: CoverImage;
  };
  rawAutomationInput?: string;
  status: "ready" | "partial" | "missing";
  createdAt?: string;
  updatedAt?: string;
};

export type IngestPayload = {
  date?: string;
  newsText: string;
  techText: string;
};
