/*
 * Data source: official public health records only.
 * Each record must include a province, disease, status, source,
 * publication date and source URL.
 *
 * Keep status values limited to:
 *   "confirmed" — official confirmation
 *   "alert" — official alert or suspected event requiring confirmation
 * Never add data from GNews or NewsData.io here.
 */
window.RDC_HEALTH_DATA = [
  {
    province: "Ituri",
    disease: "Maladie à virus Bundibugyo (Ebola)",
    mapLabel: "EBOLA · BUNDIBUGYO",
    status: "confirmed",
    source: "OMS Afrique — République démocratique du Congo",
    date: "2026-11-15",
    url: "https://www.afro.who.int/countries/democratic-republic-of-congo/news/six-months-accessing-hard-reach-communities-key-halting-ebola-outbreak",
    provisional: true,
    note: "Au 15 novembre 2026, l’OMS rapporte une transmission toujours importante à Bunia et des foyers initiaux contrôlés dans plusieurs autres localités."
  },
  {
    province: "South Kivu",
    provinceAliases: ["Sud-Kivu"],
    disease: "Mpox — clade I",
    status: "historical",
    source: "OMS — Disease Outbreak News",
    date: "2024-06-14",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2024-DON522",
    provisional: true,
    note: "Données provisoires OMS : foyer confirmé dans le Sud-Kivu en 2024. Vérifier la situation actuelle sur les rapports officiels."
  },
  {
    province: "North Kivu",
    provinceAliases: ["Nord-Kivu"],
    disease: "Mpox — clade I",
    status: "historical",
    source: "OMS — Disease Outbreak News",
    date: "2024-06-14",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2024-DON522",
    provisional: true,
    note: "Données provisoires OMS : propagation signalée vers le Nord-Kivu en 2024. Vérifier la situation actuelle sur les rapports officiels."
  }
];
