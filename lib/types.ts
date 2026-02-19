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

export type CoverBlock =
  | "news"
  | "tech"
  | "cyprus_football"
  | "greek_super_league"
  | "euroleague"
  | "european_football"
  | "national_football"
  | "match_center";

export type SectionSet = Record<CoverBlock, Record<string, Subsection>>;

export type CoverImage = {
  block: CoverBlock;
  imageUrl: string;
  prompt: string;
  keywords: string[];
};

export type DailyIssue = {
  date: string;
  sections: SectionSet;
  covers: Partial<Record<CoverBlock, CoverImage>>;
  rawAutomationInput?: string;
  status: "ready" | "partial" | "missing";
  createdAt?: string;
  updatedAt?: string;
};

export type IngestPayload = {
  date?: string;
  newsText: string;
  techText: string;
  sportsText?: string;
};
