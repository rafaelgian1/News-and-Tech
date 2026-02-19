import { CoverBlock } from "@/lib/types";

export type SubsectionDefinition = {
  key: string;
  label: string;
  labelEl: string;
};

export type SectionDefinition = {
  key: CoverBlock;
  titleKey: string;
  fallbackCover: string;
  defaultSubsection: string;
  subsections: SubsectionDefinition[];
};

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "news",
    titleKey: "news",
    fallbackCover: "/news.png",
    defaultSubsection: "world",
    subsections: [
      { key: "cyprus", label: "Cyprus", labelEl: "Κύπρος" },
      { key: "greece", label: "Greece", labelEl: "Ελλάδα" },
      { key: "world", label: "Worldwide", labelEl: "Κόσμος" }
    ]
  },
  {
    key: "tech",
    titleKey: "tech",
    fallbackCover: "/tech.png",
    defaultSubsection: "other",
    subsections: [
      { key: "cs", label: "Computer Science", labelEl: "Επιστήμη Υπολογιστών" },
      { key: "programming", label: "Programming", labelEl: "Προγραμματισμός" },
      { key: "ai_llm", label: "AI/LLMs", labelEl: "AI/LLM" },
      { key: "other", label: "Engineering", labelEl: "Μηχανική" }
    ]
  },
  {
    key: "cyprus_football",
    titleKey: "cyprusFootball",
    fallbackCover: "/news.png",
    defaultSubsection: "cyprus_league_general",
    subsections: [
      { key: "cyprus_league_general", label: "Cyprus League (General)", labelEl: "Πρωτάθλημα Κύπρου (Γενικά)" },
      { key: "apollon_limassol", label: "Apollon Limassol", labelEl: "Απόλλων Λεμεσού" },
      { key: "ael_limassol", label: "AEL Limassol", labelEl: "ΑΕΛ Λεμεσού" },
      { key: "apoel_nicosia", label: "APOEL Nicosia", labelEl: "ΑΠΟΕΛ Λευκωσίας" },
      { key: "omonoia_nicosia", label: "Omonoia Nicosia", labelEl: "Ομόνοια Λευκωσίας" },
      { key: "anorthosis_famagusta", label: "Anorthosis Famagusta", labelEl: "Ανόρθωση Αμμοχώστου" },
      { key: "aek_larnaka", label: "AEK Larnaka", labelEl: "ΑΕΚ Λάρνακας" }
    ]
  },
  {
    key: "greek_super_league",
    titleKey: "greekSuperLeague",
    fallbackCover: "/news.png",
    defaultSubsection: "greek_super_league_general",
    subsections: [
      {
        key: "greek_super_league_general",
        label: "Greek Super League (General)",
        labelEl: "Ελληνική Super League (Γενικά)"
      },
      { key: "olympiacos_piraeus", label: "Olympiacos Piraeus", labelEl: "Ολυμπιακός Πειραιώς" },
      { key: "aek_athens", label: "AEK Athens", labelEl: "ΑΕΚ Αθήνας" },
      { key: "panathinaikos_fc", label: "Panathinaikos FC", labelEl: "Παναθηναϊκός" },
      { key: "paok_fc", label: "PAOK FC", labelEl: "ΠΑΟΚ" },
      { key: "aris_fc", label: "Aris FC", labelEl: "Άρης" }
    ]
  },
  {
    key: "euroleague",
    titleKey: "euroleague",
    fallbackCover: "/tech.png",
    defaultSubsection: "euroleague_general",
    subsections: [
      { key: "euroleague_general", label: "EuroLeague (General)", labelEl: "EuroLeague (Γενικά)" },
      { key: "anadolu_efes", label: "Anadolu Efes", labelEl: "Αναντολού Εφές" },
      { key: "as_monaco", label: "AS Monaco", labelEl: "AS Μονακό" },
      { key: "baskonia", label: "Baskonia", labelEl: "Μπασκόνια" },
      { key: "crvena_zvezda", label: "Crvena Zvezda", labelEl: "Ερυθρός Αστέρας" },
      { key: "fenerbahce", label: "Fenerbahce", labelEl: "Φενέρμπαχτσε" },
      { key: "fc_barcelona", label: "FC Barcelona", labelEl: "Μπαρτσελόνα" },
      { key: "bayern_munich", label: "Bayern Munich", labelEl: "Μπάγερν Μονάχου" },
      { key: "maccabi_tel_aviv", label: "Maccabi Tel Aviv", labelEl: "Μακάμπι Τελ Αβίβ" },
      { key: "olimpia_milano", label: "Olimpia Milano", labelEl: "Ολίμπια Μιλάνο" },
      { key: "olympiacos", label: "Olympiacos", labelEl: "Ολυμπιακός" },
      { key: "panathinaikos", label: "Panathinaikos", labelEl: "Παναθηναϊκός" },
      { key: "paris_basketball", label: "Paris Basketball", labelEl: "Paris Basketball" },
      { key: "partizan", label: "Partizan", labelEl: "Παρτιζάν" },
      { key: "real_madrid", label: "Real Madrid", labelEl: "Ρεάλ Μαδρίτης" },
      { key: "valencia_basket", label: "Valencia Basket", labelEl: "Βαλένθια" },
      { key: "virtus_bologna", label: "Virtus Bologna", labelEl: "Βίρτους Μπολόνια" },
      { key: "zalgiris", label: "Zalgiris Kaunas", labelEl: "Ζαλγκίρις Κάουνας" },
      { key: "asvel", label: "ASVEL Villeurbanne", labelEl: "ASVEL Βιλερμπάν" },
      { key: "hapoel_tel_aviv", label: "Hapoel Tel Aviv", labelEl: "Χάποελ Τελ Αβίβ" },
      { key: "dubai_bc", label: "Dubai BC", labelEl: "Dubai BC" }
    ]
  },
  {
    key: "european_football",
    titleKey: "europeanFootball",
    fallbackCover: "/news.png",
    defaultSubsection: "champions_league",
    subsections: [
      { key: "champions_league", label: "UEFA Champions League", labelEl: "UEFA Champions League" },
      { key: "europa_league", label: "UEFA Europa League", labelEl: "UEFA Europa League" },
      { key: "conference_league", label: "UEFA Conference League", labelEl: "UEFA Conference League" },
      { key: "premier_league", label: "Premier League", labelEl: "Premier League" },
      { key: "la_liga", label: "La Liga", labelEl: "La Liga" },
      { key: "serie_a", label: "Serie A", labelEl: "Serie A" },
      { key: "ligue_1", label: "Ligue 1", labelEl: "Ligue 1" },
      { key: "bundesliga", label: "Bundesliga", labelEl: "Bundesliga" }
    ]
  },
  {
    key: "national_football",
    titleKey: "nationalFootball",
    fallbackCover: "/news.png",
    defaultSubsection: "euro",
    subsections: [
      { key: "euro", label: "UEFA Euro", labelEl: "UEFA Euro" },
      { key: "world_cup", label: "FIFA World Cup", labelEl: "FIFA World Cup" },
      { key: "nations_league", label: "UEFA Nations League", labelEl: "UEFA Nations League" },
      { key: "copa_africa", label: "Africa Cup of Nations", labelEl: "Κύπελλο Εθνών Αφρικής" },
      { key: "copa_america", label: "Copa America", labelEl: "Copa America" }
    ]
  },
  {
    key: "match_center",
    titleKey: "matchCenter",
    fallbackCover: "/tech.png",
    defaultSubsection: "football_cyprus_league",
    subsections: [
      { key: "football_cyprus_league", label: "Football · Cyprus League", labelEl: "Ποδόσφαιρο · Κυπριακό Πρωτάθλημα" },
      {
        key: "football_greek_super_league",
        label: "Football · Greek Super League",
        labelEl: "Ποδόσφαιρο · Ελληνική Super League"
      },
      {
        key: "football_champions_league",
        label: "Football · Champions League",
        labelEl: "Ποδόσφαιρο · Champions League"
      },
      { key: "football_europa_league", label: "Football · Europa League", labelEl: "Ποδόσφαιρο · Europa League" },
      {
        key: "football_conference_league",
        label: "Football · Conference League",
        labelEl: "Ποδόσφαιρο · Conference League"
      },
      { key: "football_premier_league", label: "Football · Premier League", labelEl: "Ποδόσφαιρο · Premier League" },
      { key: "football_bundesliga", label: "Football · Bundesliga", labelEl: "Ποδόσφαιρο · Bundesliga" },
      { key: "football_serie_a", label: "Football · Serie A", labelEl: "Ποδόσφαιρο · Serie A" },
      { key: "football_ligue_1", label: "Football · Ligue 1", labelEl: "Ποδόσφαιρο · Ligue 1" },
      { key: "football_la_liga", label: "Football · La Liga", labelEl: "Ποδόσφαιρο · La Liga" },
      { key: "basketball_euroleague", label: "Basketball · EuroLeague", labelEl: "Μπάσκετ · EuroLeague" },
      {
        key: "basketball_greek_league",
        label: "Basketball · Greek Basketball League",
        labelEl: "Μπάσκετ · Ελληνική Basket League"
      },
      { key: "national_euro", label: "National Teams · UEFA Euro", labelEl: "Εθνικές Ομάδες · UEFA Euro" },
      { key: "national_world_cup", label: "National Teams · FIFA World Cup", labelEl: "Εθνικές Ομάδες · FIFA World Cup" },
      {
        key: "national_nations_league",
        label: "National Teams · Nations League",
        labelEl: "Εθνικές Ομάδες · Nations League"
      }
    ]
  }
];

export const SECTION_ORDER: CoverBlock[] = SECTION_DEFINITIONS.map((section) => section.key);

export const SECTION_BY_KEY: Record<CoverBlock, SectionDefinition> = SECTION_DEFINITIONS.reduce(
  (acc, section) => {
    acc[section.key] = section;
    return acc;
  },
  {} as Record<CoverBlock, SectionDefinition>
);

export function sectionTitleKey(block: CoverBlock) {
  return SECTION_BY_KEY[block].titleKey;
}

export function sectionFallbackCover(block: CoverBlock) {
  return SECTION_BY_KEY[block].fallbackCover;
}

export function sectionDefaultSubsection(block: CoverBlock) {
  return SECTION_BY_KEY[block].defaultSubsection;
}

export function subsectionLabelGreekMap() {
  return SECTION_DEFINITIONS.reduce<Record<string, string>>((acc, section) => {
    section.subsections.forEach((subsection) => {
      acc[subsection.label] = subsection.labelEl;
    });
    return acc;
  }, {});
}
