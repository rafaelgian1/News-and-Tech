import { subsectionLabelGreekMap } from "@/lib/sections";

export type AppLanguage = "en" | "el";

export const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "el", label: "Greek" }
];

const DICT: Record<AppLanguage, Record<string, string>> = {
  en: {
    appTitle: "Daily Brief Newspaper",
    selectDate: "Select date",
    searchBrief: "Search brief",
    searchPlaceholder: "Search facts, analysis, implications",
    themeLight: "Light",
    themeDark: "Dark",
    archive: "Archive",
    last7Days: "Last 7 days",
    news: "News",
    tech: "Tech",
    cyprusFootball: "Cyprus Football",
    greekSuperLeague: "Greek Super League",
    euroleague: "EuroLeague",
    europeanFootball: "European Football",
    nationalFootball: "National Football",
    matchCenter: "Match Center",
    noBriefForDate: "No brief available for {date}",
    feedMissing: "The automation feed is missing or delayed. You can retry ingestion for this day.",
    retryIngestion: "Retry ingestion",
    noIssueForDate: "No issue is available for {selectedDate} yet. Showing the latest available brief from {issueDate}.",
    ingestSelectedDay: "Ingest this day now",
    ingestingDay: "Ingesting...",
    ingestFailed: "Ingestion failed. Please try again.",
    manualIngest: "Manual ingest",
    manualIngestTitle: "Paste daily content",
    manualIngestSubtitle: "Paste text for {date}. You can fill one, two, or all three sections.",
    manualIngestForDate: "Issue date",
    manualNewsLabel: "News text",
    manualTechLabel: "Tech text",
    manualSportsLabel: "Sports text",
    manualNewsPlaceholder: "Paste Cyprus, Greece, Worldwide updates...",
    manualTechPlaceholder: "Paste Computer Science, Programming, AI/LLM, Engineering updates...",
    manualSportsPlaceholder: "Paste football, euroleague, and match-center updates...",
    manualIngestCancel: "Cancel",
    manualIngestSubmit: "Ingest pasted content",
    manualIngestRunning: "Ingesting content...",
    manualIngestNeedInput: "Add text to at least one field before ingestion.",
    coverPending: "Cover pending",
    noHeadlines: "No headlines yet.",
    minRead: "min read",
    updates: "updates",
    savePdf: "Save PDF",
    savePdfFailed: "PDF export failed. Please try again.",
    open: "Open",
    close: "Close",
    noMatching: "No matching items for this subsection.",
    noItems: "No items in this subsection.",
    keyFacts: "Key facts",
    implications: "Implications",
    watchNext: "What to watch next",
    credibilityNote: "Credibility note",
    sources: "Sources",
    analysis: "Analysis",
    language: "Language",
    translating: "Translating...",
    translationUnavailable: "Translation unavailable. Showing original text."
  },
  el: {
    appTitle: "Ημερήσια Εφημερίδα Σύνοψης",
    selectDate: "Επιλογή ημερομηνίας",
    searchBrief: "Αναζήτηση σύνοψης",
    searchPlaceholder: "Αναζήτηση σε γεγονότα, ανάλυση, επιπτώσεις",
    themeLight: "Φωτεινό",
    themeDark: "Σκούρο",
    archive: "Αρχείο",
    last7Days: "Τελευταίες 7 ημέρες",
    news: "Ειδήσεις",
    tech: "Τεχνολογία",
    cyprusFootball: "Κυπριακό Ποδόσφαιρο",
    greekSuperLeague: "Ελληνική Super League",
    euroleague: "EuroLeague",
    europeanFootball: "Ευρωπαϊκό Ποδόσφαιρο",
    nationalFootball: "Εθνικές Ομάδες",
    matchCenter: "Κέντρο Αγώνων",
    noBriefForDate: "Δεν υπάρχει σύνοψη για {date}",
    feedMissing: "Η ροή αυτοματισμού λείπει ή έχει καθυστέρηση. Μπορείς να δοκιμάσεις ξανά για αυτή την ημέρα.",
    retryIngestion: "Επανάληψη λήψης",
    noIssueForDate: "Δεν υπάρχει ακόμα τεύχος για {selectedDate}. Προβάλλεται το πιο πρόσφατο διαθέσιμο από {issueDate}.",
    ingestSelectedDay: "Λήψη για αυτή την ημέρα",
    ingestingDay: "Γίνεται λήψη...",
    ingestFailed: "Η λήψη απέτυχε. Προσπάθησε ξανά.",
    manualIngest: "Χειροκίνητη λήψη",
    manualIngestTitle: "Επικόλληση ημερήσιου περιεχομένου",
    manualIngestSubtitle: "Επικόλλησε κείμενο για {date}. Μπορείς να συμπληρώσεις μία, δύο ή και τις τρεις ενότητες.",
    manualIngestForDate: "Ημερομηνία τεύχους",
    manualNewsLabel: "Κείμενο ειδήσεων",
    manualTechLabel: "Κείμενο τεχνολογίας",
    manualSportsLabel: "Κείμενο αθλητικών",
    manualNewsPlaceholder: "Επικόλλησε ενημερώσεις για Κύπρο, Ελλάδα, Κόσμο...",
    manualTechPlaceholder: "Επικόλλησε ενημερώσεις για CS, Programming, AI/LLM, Engineering...",
    manualSportsPlaceholder: "Επικόλλησε ενημερώσεις για ποδόσφαιρο, euroleague και match center...",
    manualIngestCancel: "Ακύρωση",
    manualIngestSubmit: "Λήψη από επικολλημένο κείμενο",
    manualIngestRunning: "Γίνεται λήψη περιεχομένου...",
    manualIngestNeedInput: "Πρόσθεσε κείμενο σε τουλάχιστον ένα πεδίο πριν τη λήψη.",
    coverPending: "Εκκρεμεί εικόνα εξωφύλλου",
    noHeadlines: "Δεν υπάρχουν τίτλοι ακόμη.",
    minRead: "λεπτά ανάγνωσης",
    updates: "ενημερώσεις",
    savePdf: "Αποθήκευση PDF",
    savePdfFailed: "Η εξαγωγή PDF απέτυχε. Προσπάθησε ξανά.",
    open: "Άνοιγμα",
    close: "Κλείσιμο",
    noMatching: "Δεν βρέθηκαν ταιριαστά στοιχεία για αυτή την ενότητα.",
    noItems: "Δεν υπάρχουν στοιχεία σε αυτή την ενότητα.",
    keyFacts: "Βασικά γεγονότα",
    implications: "Επιπτώσεις",
    watchNext: "Τι να παρακολουθήσετε στη συνέχεια",
    credibilityNote: "Σημείωση αξιοπιστίας",
    sources: "Πηγές",
    analysis: "Ανάλυση",
    language: "Γλώσσα",
    translating: "Μετάφραση...",
    translationUnavailable: "Η μετάφραση δεν είναι διαθέσιμη. Εμφάνιση αρχικού κειμένου."
  }
};

const SUBSECTION_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {},
  el: subsectionLabelGreekMap()
};

export function t(lang: AppLanguage, key: string, vars?: Record<string, string>) {
  const template = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (!vars) {
    return template;
  }

  return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, value), template);
}

export function localeForLanguage(lang: AppLanguage) {
  return lang === "el" ? "el-GR" : "en-US";
}

export function localizeSubsectionLabel(label: string, lang: AppLanguage) {
  return SUBSECTION_LABELS[lang][label] ?? label;
}
