const provinceNames = {
  "Central Kasai": "Kasaï-Central",
  "Kasai": "Kasaï",
  "Kasai-Oriental": "Kasaï-Oriental",
  "Kongo-Central": "Kongo-Central",
  "Lower Uele": "Bas-Uele",
  "North Kivu": "Nord-Kivu",
  "South Kivu": "Sud-Kivu",
  "Upper Uele": "Haut-Uele"
};

const map = document.getElementById("province-map");
const provinceList = document.getElementById("province-list");
const mapCount = document.getElementById("province-count");
const mapError = document.getElementById("map-error");
const mapZoomIn = document.getElementById("map-zoom-in");
const mapZoomOut = document.getElementById("map-zoom-out");
const mapFit = document.getElementById("map-fit");
const mapZoomLevel = document.getElementById("map-zoom-level");
const appShell = document.getElementById("app-shell");
const navToggle = document.getElementById("nav-toggle");
const navBackdrop = document.getElementById("nav-backdrop");
const navLinks = [...document.querySelectorAll(".app-nav-link")];
const appSections = [...document.querySelectorAll("main > .app-section")];
const outbreakList = document.getElementById("outbreak-list");
const detailTitle = document.getElementById("detail-title");
const detailCopy = document.getElementById("detail-copy");
const selectedLegend = document.getElementById("selected-legend");
const newsResults = document.getElementById("news-results");
const dailyNewsFeed = document.getElementById("daily-news-feed");
const dailyUpdateStatus = document.getElementById("daily-update-status");
const dailySourceStatus = document.getElementById("daily-source-status");
const dailyNewsFilters = document.getElementById("daily-news-filters");
const dailyNewsSearch = document.getElementById("daily-news-search");
const dailyNewsSource = document.getElementById("daily-news-source");
const dailyNewsCategory = document.getElementById("daily-news-category");
const dailyNewsFrom = document.getElementById("daily-news-from");
const dailyNewsTo = document.getElementById("daily-news-to");
const dailyNewsFavoritesOnly = document.getElementById("daily-news-favorites");
const dailyNewsFilterCount = document.getElementById("daily-news-filter-count");
const favoriteStorageStatus = document.getElementById("favorite-storage-status");
const accountForm = document.getElementById("account-form");
const accountEmail = document.getElementById("account-email");
const accountPassword = document.getElementById("account-password");
const accountStatus = document.getElementById("account-status");
const accountSignOut = document.getElementById("account-sign-out");
const emptyState = document.getElementById("empty-state");
const settingsToggle = document.getElementById("settings-toggle");
const settingsForm = document.getElementById("settings-form");
const commentForm = document.getElementById("comment-form");
const commentStatus = document.getElementById("comment-status");
const analyticsPeriod = document.getElementById("analytics-period");
const analyticsSummary = document.getElementById("analytics-summary");
const analyticsChartCanvas = document.getElementById("outbreak-chart");
const exportReportButton = document.getElementById("export-report");
const exportReportStatus = document.getElementById("export-report-status");
const alertNotificationsToggle = document.getElementById("alert-notifications-toggle");
const alertNotificationsStatus = document.getElementById("alert-notifications-status");
const networkStatus = document.getElementById("network-status");
const ALERT_NOTIFICATION_STORAGE_KEY = "rdc-health-alert-notifications";
let selectedFeatureId = null;
let outbreakChart = null;
let dailyNewsItems = [];
let favoriteArticles = new Map();
let localFavoriteArticles = new Map();
const FAVORITES_STORAGE_KEY = "rdc-health-favorites";
let supabaseClient = null;
let accountUser = null;
let supabaseInitialization = null;
let offlineCacheReady = false;
let offlineSupportError = false;
const loadedSectionData = new Set();
const sectionDataRequests = new Map();
const dataScriptRequests = new Map();
const MAP_VIEWBOX = { x: 0, y: 0, width: 820, height: 740 };
const MAP_ASPECT_RATIO = MAP_VIEWBOX.width / MAP_VIEWBOX.height;
let currentMapViewBox = { ...MAP_VIEWBOX };

function updateMapViewBox(viewBox) {
  const width = Math.min(MAP_VIEWBOX.width, Math.max(MAP_VIEWBOX.width / 6, viewBox.width));
  const height = width / MAP_ASPECT_RATIO;
  const x = Math.max(0, Math.min(MAP_VIEWBOX.width - width, viewBox.x));
  const y = Math.max(0, Math.min(MAP_VIEWBOX.height - height, viewBox.y));
  currentMapViewBox = { x, y, width, height };
  map.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  mapZoomLevel.textContent = `${Math.round((MAP_VIEWBOX.width / width) * 100)} %`;
}

function zoomMap(factor) {
  const width = Math.min(
    MAP_VIEWBOX.width,
    Math.max(MAP_VIEWBOX.width / 6, currentMapViewBox.width * factor)
  );
  const height = width / MAP_ASPECT_RATIO;
  const centerX = currentMapViewBox.x + currentMapViewBox.width / 2;
  const centerY = currentMapViewBox.y + currentMapViewBox.height / 2;
  updateMapViewBox({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width
  });
}

function zoomMapToBounds(bounds) {
  const padding = 1.35;
  const width = Math.min(
    MAP_VIEWBOX.width,
    Math.max(
      MAP_VIEWBOX.width / 6,
      bounds.width * padding,
      bounds.height * MAP_ASPECT_RATIO * padding
    )
  );
  const height = width / MAP_ASPECT_RATIO;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  updateMapViewBox({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width
  });
}

function zoomMapToPoint(x, y) {
  const width = MAP_VIEWBOX.width / 4;
  const height = width / MAP_ASPECT_RATIO;
  updateMapViewBox({
    x: x - width / 2,
    y: y - height / 2,
    width
  });
}

mapZoomIn.addEventListener("click", () => zoomMap(1 / 1.3));
mapZoomOut.addEventListener("click", () => zoomMap(1.3));
mapFit.addEventListener("click", () => updateMapViewBox(MAP_VIEWBOX));

function setNavigationOpen(isOpen) {
  appShell.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Fermer la navigation" : "Ouvrir la navigation");
  navBackdrop.hidden = !isOpen;
}

function updateNetworkStatus() {
  const narrowScreen = window.matchMedia("(max-width: 560px)").matches;
  const isOffline = !navigator.onLine;
  networkStatus.classList.toggle("is-offline", isOffline || offlineSupportError);

  if (offlineSupportError) {
    networkStatus.textContent = narrowScreen
      ? "Cache indisponible"
      : "Mode hors ligne indisponible";
  } else if (isOffline) {
    networkStatus.textContent = narrowScreen
      ? offlineCacheReady ? "Hors ligne" : "Cache non prêt"
      : offlineCacheReady ? "Hors ligne · cache prêt" : "Hors ligne · cache non vérifié";
  } else {
    networkStatus.textContent = narrowScreen
      ? offlineCacheReady ? "Prêt hors ligne" : "Préparation…"
      : offlineCacheReady ? "Prêt hors ligne" : "Préparation hors ligne";
  }
}

function requestDailyUpdatesSync(registration) {
  if (registration.sync && typeof registration.sync.register === "function") {
    registration.sync.register("sync-daily-health-updates")
      .catch((error) => console.error("Impossible de planifier la synchronisation des rapports.", error));
  }

  if (navigator.onLine && registration.active) {
    registration.active.postMessage({ type: "SYNC_DAILY_UPDATES" });
  }
}

function initializeOfflineSupport() {
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  window.addEventListener("resize", updateNetworkStatus);
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "DAILY_UPDATES_SYNCED" && loadedSectionData.has("actualites")) {
      loadDailyUpdates();
    }
  });

  const isSecureOrigin = location.protocol === "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!isSecureOrigin || !("serviceWorker" in navigator)) {
    offlineSupportError = true;
    updateNetworkStatus();
    return;
  }

  updateNetworkStatus();
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => {
      offlineCacheReady = true;
      updateNetworkStatus();
      requestDailyUpdatesSync(registration);
      window.addEventListener("online", () => requestDailyUpdatesSync(registration));
    })
    .catch((error) => {
      console.error("Impossible d’activer la consultation hors ligne.", error);
      offlineSupportError = true;
      updateNetworkStatus();
    });
}

initializeOfflineSupport();

function loadDataScript(source) {
  if (dataScriptRequests.has(source)) return dataScriptRequests.get(source);

  const script = document.createElement("script");
  script.src = source;
  const request = new Promise((resolve, reject) => {
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => {
      reject(new Error(`Impossible de charger ${source}.`));
    }, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    dataScriptRequests.delete(source);
    throw error;
  });
  dataScriptRequests.set(source, request);
  return request;
}

function loadSectionData(sectionId) {
  if (loadedSectionData.has(sectionId) || sectionDataRequests.has(sectionId)) return;
  const initialize = {
    actualites: initializeActualitesSection,
    epidemies: initializeOutbreakSection
  }[sectionId];
  if (!initialize) return;

  const request = initialize()
    .then(() => loadedSectionData.add(sectionId))
    .catch((error) => {
      console.error(`Impossible de charger les données de la section ${sectionId}.`, error);
      if (sectionId === "actualites") {
        mapCount.textContent = "Carte indisponible";
        mapError.hidden = false;
        dailyUpdateStatus.textContent = "Les données de cette section n’ont pas pu être chargées.";
      } else {
        const message = document.createElement("p");
        message.className = "news-status";
        message.textContent = "Les données officielles ne peuvent pas être chargées pour le moment.";
        outbreakList.replaceChildren(message);
      }
    })
    .finally(() => sectionDataRequests.delete(sectionId));
  sectionDataRequests.set(sectionId, request);
}

async function initializeActualitesSection() {
  await Promise.all([
    loadDataScript("data/provinces-rdc.js"),
    loadDataScript("data/health-data.js"),
    loadDataScript("data/city-health-data.js")
  ]);
  loadProvinces();
  loadLocalFavorites();
  initializeSupabaseFeatures();
  loadDailyUpdates();
}

async function initializeOutbreakSection() {
  const loading = document.createElement("p");
  loading.className = "news-status";
  loading.textContent = "Chargement des alertes officielles…";
  outbreakList.replaceChildren(loading);
  await loadDataScript("data/health-data.js");
  renderOutbreakSection();
  await initializeOutbreakAnalytics();
}

const chartScriptUrl = "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";
const pdfScriptUrl = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const mapMarkerStatuses = [
  { key: "ongoing", label: "Transmission signalée", color: "#b4232f" },
  { key: "controlled", label: "Foyer initial contrôlé", color: "#25815a" },
  { key: "community", label: "Action communautaire", color: "#3676a7" },
  { key: "provincial", label: "Contexte provincial", color: "#607989" },
  { key: "access", label: "Accès à la riposte entravé", color: "#a76b21" },
  { key: "indicator", label: "Indicateur provincial", color: "#7054a0" },
  { key: "other", label: "Autre information cartographiée", color: "#aab5ae" }
];

async function initializeOutbreakAnalytics() {
  try {
    await Promise.all([
      loadDataScript("data/city-health-data.js"),
      loadDataScript(chartScriptUrl)
    ]);
    if (typeof window.Chart !== "function") {
      throw new Error("Chart.js n’est pas disponible après le chargement du script.");
    }
    renderOutbreakChart();
  } catch (error) {
    console.error("Impossible de charger le graphique analytique.", error);
    analyticsSummary.textContent = "Le graphique n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Réessayer le graphique";
    retry.addEventListener("click", initializeOutbreakAnalytics, { once: true });
    analyticsSummary.append(" ", retry);
  }
}

function getOutbreakRecords() {
  return Array.isArray(window.RDC_HEALTH_DATA) ? window.RDC_HEALTH_DATA : [];
}

function getAlertNotificationState() {
  const saved = localStorage.getItem(ALERT_NOTIFICATION_STORAGE_KEY);
  if (!saved) return { enabled: false, notifiedKeys: [] };

  const state = JSON.parse(saved);
  if (
    !state ||
    typeof state.enabled !== "boolean" ||
    !Array.isArray(state.notifiedKeys) ||
    state.notifiedKeys.some((key) => typeof key !== "string")
  ) {
    throw new Error("Les préférences de notification enregistrées sont invalides.");
  }
  return state;
}

function saveAlertNotificationState(state) {
  localStorage.setItem(ALERT_NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
}

function setAlertNotificationControl(enabled) {
  alertNotificationsToggle.setAttribute("aria-pressed", String(enabled));
  alertNotificationsToggle.textContent = enabled
    ? "Désactiver les notifications web"
    : "Activer les notifications web";
}

function activeHealthAlerts() {
  return getOutbreakRecords().filter((record) =>
    record.status === "confirmed" || record.status === "alert"
  );
}

function alertNotificationKey(record) {
  return JSON.stringify([
    record.province,
    record.disease,
    record.status,
    record.date,
    record.source
  ]);
}

function notifyNewHealthAlerts(state) {
  if (!state.enabled || Notification.permission !== "granted") return 0;

  let sentCount = 0;
  activeHealthAlerts().forEach((record) => {
    const key = alertNotificationKey(record);
    if (state.notifiedKeys.includes(key)) return;

    const notification = new Notification(`Alerte sanitaire officielle — ${record.province}`, {
      body: `${record.disease} · ${record.status === "confirmed" ? "Confirmation officielle" : "Alerte à vérifier"}${record.provisional ? " · Données provisoires" : ""} · ${record.source} · ${formatPublicationDate(record.date)}`,
      tag: key
    });
    notification.onclick = () => {
      window.focus();
      window.location.hash = "epidemies";
    };
    state.notifiedKeys.push(key);
    saveAlertNotificationState(state);
    sentCount += 1;
  });
  return sentCount;
}

function refreshAlertNotifications() {
  if (!("Notification" in window)) {
    setAlertNotificationControl(false);
    alertNotificationsToggle.disabled = true;
    alertNotificationsStatus.textContent = "Les notifications de navigateur ne sont pas prises en charge par ce navigateur.";
    return;
  }

  alertNotificationsToggle.disabled = false;
  try {
    const state = getAlertNotificationState();
    setAlertNotificationControl(state.enabled && Notification.permission === "granted");
    if (state.enabled && Notification.permission === "granted") {
      const sentCount = notifyNewHealthAlerts(state);
      alertNotificationsStatus.textContent = sentCount
        ? `${sentCount} nouvelle(s) alerte(s) officielle(s) signalée(s).`
        : "Notifications activées. Aucune nouvelle alerte officielle active.";
    } else if (state.enabled && Notification.permission === "denied") {
      alertNotificationsStatus.textContent = "Autorisation refusée dans le navigateur. Modifiez ses paramètres de notification pour réactiver les alertes.";
    }
  } catch (error) {
    console.error("Impossible de mettre à jour les notifications sanitaires.", error);
    alertNotificationsStatus.textContent = "Impossible de lire ou d’enregistrer les préférences de notification dans ce navigateur.";
  }
}

async function toggleAlertNotifications() {
  if (!("Notification" in window)) {
    alertNotificationsStatus.textContent = "Les notifications de navigateur ne sont pas prises en charge par ce navigateur.";
    return;
  }

  try {
    const state = getAlertNotificationState();
    if (state.enabled && Notification.permission === "granted") {
      state.enabled = false;
      saveAlertNotificationState(state);
      setAlertNotificationControl(false);
      alertNotificationsStatus.textContent = "Notifications désactivées sur ce navigateur.";
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setAlertNotificationControl(false);
      alertNotificationsStatus.textContent = permission === "denied"
        ? "Autorisation refusée. Vous pouvez la modifier dans les paramètres de votre navigateur."
        : "Autorisation non accordée. Cliquez à nouveau et acceptez les notifications pour activer le suivi.";
      return;
    }

    state.enabled = true;
    saveAlertNotificationState(state);
    setAlertNotificationControl(true);
    const sentCount = notifyNewHealthAlerts(state);
    alertNotificationsStatus.textContent = sentCount
      ? `Notifications activées; ${sentCount} alerte(s) officielle(s) active(s) signalée(s).`
      : "Notifications activées. Vous serez averti des nouvelles alertes officielles chargées.";
  } catch (error) {
    console.error("Impossible d’activer les notifications sanitaires.", error);
    alertNotificationsStatus.textContent = "Impossible d’activer ou d’enregistrer les notifications dans ce navigateur.";
  }
}

function getRecordsForChart() {
  const monthCount = Number(analyticsPeriod.value);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  currentMonth.setDate(0);
  currentMonth.setHours(23, 59, 59, 999);
  const firstMonth = new Date(currentMonth);
  firstMonth.setDate(1);
  firstMonth.setHours(0, 0, 0, 0);
  firstMonth.setMonth(firstMonth.getMonth() - monthCount + 1);
  const records = (Array.isArray(window.RDC_CITY_HEALTH_DATA)
    ? window.RDC_CITY_HEALTH_DATA
    : []).filter((record) => {
    if (!record.date) return false;
    const date = new Date(record.date);
    return !Number.isNaN(date.getTime()) && date >= firstMonth && date <= currentMonth;
  });
  const provinces = [...new Set(records.map((record) => record.province))]
    .sort((a, b) => a.localeCompare(b, "fr"));
  return { records, provinces };
}

function renderOutbreakChart() {
  const { records, provinces } = getRecordsForChart();
  const knownStatuses = mapMarkerStatuses
    .filter((status) => status.key !== "other")
    .map((status) => status.key);
  const datasets = mapMarkerStatuses.map((status) => ({
    label: status.label,
    data: provinces.map((province) => records.filter((record) =>
      record.province === province && (
        status.key === "other"
          ? !knownStatuses.includes(record.status)
          : record.status === status.key
      )
    ).length),
    backgroundColor: status.color,
    borderRadius: 4
  }));
  const provinceTotals = provinces.map((province) =>
    `${province} : ${records.filter((record) => record.province === province).length}`
  );

  if (outbreakChart) outbreakChart.destroy();
  outbreakChart = new window.Chart(analyticsChartCanvas, {
    type: "bar",
    data: { labels: provinces, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8, padding: 14 }
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label} : ${context.parsed.y} repère(s)`
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, stepSize: 1 },
          title: { display: true, text: "Nombre de repères cartographiques" }
        }
      }
    }
  });
  analyticsSummary.textContent = records.length
    ? `${records.length} repères cartographiques · ${provinceTotals.join(" · ")}`
    : "Aucun repère daté dans la période sélectionnée. Cela ne signifie pas qu’aucun événement sanitaire n’a été signalé.";
}

analyticsPeriod.addEventListener("change", () => {
  if (!outbreakChart) return;
  renderOutbreakChart();
});

function addPdfText(doc, text, layout, options = {}) {
  const margin = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const fontSize = options.fontSize || 10;
  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  const lineHeight = fontSize * 0.5;
  if (layout.y + lines.length * lineHeight > pageHeight - margin) {
    doc.addPage();
    layout.y = margin;
  }
  doc.text(lines, margin, layout.y);
  layout.y += lines.length * lineHeight + (options.gap || 4);
}

function addPdfSourceLink(doc, label, url, options) {
  if (!url || !url.startsWith("https://")) return;
  const margin = 16;
  if (options.y > doc.internal.pageSize.getHeight() - margin - 10) {
    doc.addPage();
    options.y = margin;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(32, 82, 63);
  doc.textWithLink(label, margin, options.y, { url });
  doc.setTextColor(27, 48, 43);
  options.y += 8;
}

async function exportWatchReport() {
  exportReportButton.disabled = true;
  exportReportStatus.hidden = false;
  exportReportStatus.textContent = "Préparation du rapport PDF…";

  try {
    await Promise.all([
      loadDataScript("data/health-data.js"),
      window.RDC_DAILY_UPDATES
        ? Promise.resolve()
        : loadDataScript(`data/daily-updates.js?date=${new Date().toISOString().slice(0, 10)}`),
      loadDataScript(pdfScriptUrl)
    ]);

    const PdfDocument = window.jspdf?.jsPDF;
    if (typeof PdfDocument !== "function") {
      throw new Error("jsPDF n’est pas disponible après le chargement du script.");
    }
    const records = getOutbreakRecords().filter((record) =>
      ["confirmed", "alert", "historical"].includes(record.status)
    );
    const updates = Array.isArray(window.RDC_DAILY_UPDATES?.items)
      ? window.RDC_DAILY_UPDATES.items.filter((item) =>
        item && typeof item.title === "string" && item.url?.startsWith("https://")
      )
      : [];
    if (!records.length && !updates.length) {
      throw new Error("Aucune donnée sourcée n’est disponible pour produire le rapport.");
    }

    const doc = new PdfDocument({ format: "a4", unit: "mm" });
    const layout = { y: 18 };
    const statusLabels = {
      confirmed: "Confirmation officielle",
      alert: "Alerte officielle",
      historical: "Information historique"
    };
    const categoryLabels = {
      official: "Source officielle",
      humanitarian: "Source humanitaire — non confirmatoire",
      media: "Média — non confirmatoire"
    };

    addPdfText(doc, "Rapport de veille sanitaire — République démocratique du Congo", layout, {
      fontSize: 16, bold: true, gap: 7
    });
    addPdfText(doc, `Généré le ${new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date())}`, layout, { fontSize: 9, gap: 8 });
    addPdfText(doc, "Ce rapport rassemble les informations disponibles dans l’application au moment de sa génération. Les sources humanitaires et médiatiques ne constituent pas une confirmation officielle d’épidémie. Les informations historiques ne décrivent pas nécessairement la situation actuelle.", layout, {
      fontSize: 10, gap: 8
    });

    addPdfText(doc, "Épidémies et alertes — sources officielles", layout, {
      fontSize: 13, bold: true, gap: 6
    });
    if (!records.length) {
      addPdfText(doc, "Aucune information officielle datée n’est disponible.", layout, { fontSize: 10 });
    }
    records.forEach((record) => {
      addPdfText(doc, `${record.disease} — ${statusLabels[record.status]}`, layout, {
        fontSize: 11, bold: true, gap: 5
      });
      addPdfText(doc, `Zone : ${record.province} · Source : ${record.source} · Publication : ${formatPublicationDate(record.date)}`, layout, {
        fontSize: 9, gap: 4
      });
      if (record.note) {
        addPdfText(doc, record.note, layout, { fontSize: 9, gap: 4 });
      }
      addPdfSourceLink(doc, "Consulter la source officielle", record.url, layout);
    });

    addPdfText(doc, "Publications récentes — contexte et veille", layout, {
      fontSize: 13, bold: true, gap: 6
    });
    if (!updates.length) {
      addPdfText(doc, "Aucune publication récente n’est disponible dans les flux chargés.", layout, { fontSize: 10 });
    }
    updates.forEach((item) => {
      addPdfText(doc, item.titleFr || item.title, layout, {
        fontSize: 10, bold: true, gap: 5
      });
      const category = categoryLabels[item.category] || "Publication sanitaire";
      addPdfText(doc, `${category} · Source : ${item.source || "Non précisée"} · Publication : ${formatPublicationDate(item.publishedAt)}`, layout, {
        fontSize: 9, gap: 4
      });
      addPdfSourceLink(doc, "Consulter la publication", item.url, layout);
    });

    doc.save(`rapport-veille-sanitaire-rdc-${new Date().toISOString().slice(0, 10)}.pdf`);
    exportReportStatus.textContent = "Le rapport PDF a été téléchargé.";
  } catch (error) {
    console.error("Impossible de générer le rapport PDF.", error);
    exportReportStatus.textContent = "Le rapport PDF n’a pas pu être généré. Vérifiez votre connexion et réessayez.";
  } finally {
    exportReportButton.disabled = false;
  }
}

exportReportButton.addEventListener("click", exportWatchReport);
alertNotificationsToggle.addEventListener("click", toggleAlertNotifications);

navToggle.addEventListener("click", () => {
  setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
});
navBackdrop.addEventListener("click", () => setNavigationOpen(false));

function showSection(sectionId, options = {}) {
  const section = appSections.find((item) => item.id === sectionId);
  if (!section) return false;

  appSections.forEach((item) => {
    item.hidden = item !== section;
  });
  navLinks.forEach((link) => {
    const active = link.hash === `#${sectionId}`;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  setNavigationOpen(false);

  if (options.updateHistory && location.hash !== `#${sectionId}`) {
    history.pushState({ sectionId }, "", `#${sectionId}`);
  }
  if (options.focus) {
    section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
  loadSectionData(sectionId);
  return true;
}

function showSectionFromLocation() {
  const requestedId = location.hash.slice(1);
  const sectionId = appSections.some((section) => section.id === requestedId)
    ? requestedId
    : appSections[0]?.id;
  if (sectionId) showSection(sectionId);
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const sectionId = link.getAttribute("href").slice(1);
  if (appSections.some((section) => section.id === sectionId)) {
    event.preventDefault();
    showSection(sectionId, { updateHistory: true, focus: true });
  }
});

window.addEventListener("popstate", showSectionFromLocation);
window.addEventListener("hashchange", showSectionFromLocation);
showSectionFromLocation();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && appShell.classList.contains("nav-open")) {
    setNavigationOpen(false);
    navToggle.focus();
  }
});

function getOfficialRecords(feature) {
  const name = getProvinceName(feature);
  const records = Array.isArray(window.RDC_HEALTH_DATA)
    ? window.RDC_HEALTH_DATA
    : [];
  return records.filter((record) =>
    provinceNames[record.province] === name ||
    record.province === name ||
    record.provinceAliases?.includes(name)
  );
}

function applyOfficialMapStatus() {
  if (!window.RDC_HEALTH_DATA) return;
  map.querySelectorAll(".province-shape").forEach((shape) => {
    const feature = window.RDC_PROVINCES.features.find(
      (item) => item.properties.shapeID === shape.dataset.featureId
    );
    if (!feature) return;
    const records = getOfficialRecords(feature);
    const hasConfirmed = records.some((record) => record.status === "confirmed");
    const hasAlert = records.some((record) => record.status === "alert");
    shape.classList.toggle("is-confirmed", hasConfirmed);
    shape.classList.toggle("is-alert", !hasConfirmed && hasAlert);
    shape.style.fill = hasConfirmed ? "#b83b3b" : (hasAlert ? "#d59b42" : "");
    if (hasConfirmed) {
      shape.setAttribute("fill", "#b83b3b");
    } else if (hasAlert) {
      shape.setAttribute("fill", "#d59b42");
    } else {
      shape.removeAttribute("fill");
    }
  });
}

function createOfficialCard(feature) {
  const records = getOfficialRecords(feature);
  if (!records.length) return null;
  const card = document.createElement("article");
  card.className = "news-source";
  const heading = document.createElement("h4");
  heading.textContent = "Informations officielles";
  card.appendChild(heading);

  records.forEach((record) => {
    const link = document.createElement("a");
    link.href = record.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const statusText = record.status === "confirmed"
      ? "épidémie confirmée"
      : record.status === "alert"
        ? "alerte officielle à vérifier"
        : "situation historique";
    link.textContent = `${record.disease} — ${statusText}`;
    const meta = document.createElement("p");
    meta.className = "news-meta";
    meta.textContent = `Source : ${record.source} · Publication : ${formatPublicationDate(record.date)} · Catégorie : officielle · ${record.provisional ? "PROVISOIRE" : "vérifiée"}`;
    card.appendChild(link);
    card.appendChild(meta);
    if (record.note) {
      const note = document.createElement("p");
      note.className = "news-meta";
      note.textContent = record.note;
      card.appendChild(note);
    }
  });
  return card;
}

settingsToggle.addEventListener("click", () => {
  const expanded = settingsToggle.getAttribute("aria-expanded") === "true";
  settingsToggle.setAttribute("aria-expanded", String(!expanded));
  settingsToggle.querySelector("span:last-child").textContent = expanded ? "+" : "−";
  settingsForm.hidden = expanded;
});

["gnews-key", "newsdata-key"].forEach((id) => {
  const saved = sessionStorage.getItem(id);
  if (saved) {
    document.getElementById(id).value = saved;
  }
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sessionStorage.setItem("gnews-key", document.getElementById("gnews-key").value.trim());
  sessionStorage.setItem("newsdata-key", document.getElementById("newsdata-key").value.trim());
  settingsToggle.setAttribute("aria-expanded", "false");
  settingsToggle.querySelector("span:last-child").textContent = "+";
  settingsForm.hidden = true;
  if (selectedFeatureId) {
    const feature = window.RDC_PROVINCES.features.find(
      (item) => item.properties.shapeID === selectedFeatureId
    );
    if (feature) {
      searchProvinceNews(feature);
    }
  }
});

commentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!commentForm.reportValidity()) return;

  const email = document.getElementById("comment-email").value.trim();
  const message = document.getElementById("comment-message").value.trim();
  if (!email || !message) {
    commentStatus.hidden = false;
    commentStatus.textContent = "Veuillez saisir une adresse e-mail et un message non vides.";
    return;
  }

  const subject = encodeURIComponent("Commentaire — Veille sanitaire RDC");
  const body = encodeURIComponent(`Adresse e-mail : ${email}\n\n${message}`);
  const recipient = commentForm.dataset.recipient;
  commentStatus.hidden = false;
  commentStatus.textContent = "Votre logiciel de messagerie devrait s’ouvrir avec un brouillon prérempli. Vérifiez-le puis envoyez le message; rien n’est transmis avant cet envoi.";
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

function formatPublicationDate(value) {
  if (!value) return "Date non communiquée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function renderOutbreakSection() {
  refreshAlertNotifications();
  const records = Array.isArray(window.RDC_HEALTH_DATA)
    ? window.RDC_HEALTH_DATA.filter((record) =>
      record.status === "confirmed" || record.status === "alert" || record.status === "historical"
    )
    : [];
  outbreakList.replaceChildren();

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "news-status";
    empty.textContent = "Aucune épidémie ou alerte officielle n’est chargée pour le moment.";
    outbreakList.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const statusDetails = {
      confirmed: { className: "is-confirmed", label: "Confirmation officielle" },
      alert: { className: "is-alert", label: "Alerte officielle" },
      historical: { className: "is-historical", label: "Information historique" }
    }[record.status];
    const card = document.createElement("article");
    card.className = `outbreak-card ${statusDetails.className}`;

    const status = document.createElement("span");
    status.className = "outbreak-status";
    status.textContent = statusDetails.label;

    const heading = document.createElement("h3");
    heading.textContent = record.disease;

    const location = document.createElement("p");
    location.textContent = `Zone : ${record.province}${record.provisional ? " · Données provisoires" : ""}`;

    const link = document.createElement("a");
    link.href = record.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Lire la publication de ${record.source} ↗`;

    const meta = document.createElement("small");
    meta.className = "outbreak-meta";
    meta.textContent = `Publication : ${formatPublicationDate(record.date)}`;

    card.append(status, heading, location, link, meta);
    if (record.note) {
      const note = document.createElement("p");
      note.textContent = record.note;
      card.appendChild(note);
    }
    outbreakList.appendChild(card);
  });
}

function createNewsCard(title, articles, sourceName) {
  const card = document.createElement("article");
  card.className = "news-source";

  const heading = document.createElement("h4");
  heading.textContent = `${sourceName} — médiatique, non confirmatoire`;
  card.appendChild(heading);

  if (!articles.length) {
    const status = document.createElement("p");
    status.className = "news-meta";
    status.textContent = "Aucun article trouvé pour cette recherche récente.";
    card.appendChild(status);
    return card;
  }

  articles.slice(0, 5).forEach((article) => {
    const link = document.createElement("a");
    link.href = article.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = article.title;

    const meta = document.createElement("p");
    meta.className = "news-meta";
    const publisher = article.publisher ? ` · ${article.publisher}` : "";
    meta.textContent = `Source : ${sourceName}${publisher} · Publication : ${formatPublicationDate(article.date)}`;

    card.appendChild(link);
    card.appendChild(meta);
  });

  return card;
}

const dailyCategoryLabels = {
  official: "Source officielle",
  humanitarian: "Source humanitaire",
  media: "Média · non confirmatoire"
};
const dailyCategoryNotes = {
  official: "Publication officielle; elle ne modifie pas automatiquement le statut affiché sur la carte.",
  humanitarian: "Publication humanitaire; elle ne constitue pas une confirmation officielle d’épidémie.",
  media: "Information médiatique; elle ne constitue pas une confirmation officielle d’épidémie."
};

function updateDailyNewsSources(items) {
  const selectedSource = dailyNewsSource.value;
  const sources = [...new Set(items.map((item) => item.source).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr"));
  dailyNewsSource.replaceChildren(new Option("Toutes les sources", ""));
  sources.forEach((source) => dailyNewsSource.add(new Option(source, source)));
  if (sources.includes(selectedSource)) {
    dailyNewsSource.value = selectedSource;
  }
}

function getFilteredDailyNewsItems() {
  const search = dailyNewsSearch.value.trim().toLocaleLowerCase("fr");
  const from = dailyNewsFrom.value;
  const to = dailyNewsTo.value;
  const sourceItems = dailyNewsFavoritesOnly.checked
    ? [...favoriteArticles.values()]
    : dailyNewsItems;
  return sourceItems.filter((item) => {
    const searchableText = [
      item.title,
      item.titleFr,
      item.source,
      item.publisher,
      dailyCategoryLabels[item.category]
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr");
    if (search && !searchableText.includes(search)) return false;
    if (dailyNewsSource.value && item.source !== dailyNewsSource.value) return false;
    if (dailyNewsCategory.value && item.category !== dailyNewsCategory.value) return false;
    if (from || to) {
      const publishedDate = new Date(item.publishedAt);
      if (Number.isNaN(publishedDate.getTime())) return false;
      const dateKey = publishedDate.toISOString().slice(0, 10);
      if (from && dateKey < from) return false;
      if (to && dateKey > to) return false;
    }
    return true;
  });
}

function renderDailyNewsItems() {
  const items = getFilteredDailyNewsItems();
  dailyNewsFeed.replaceChildren();
  updateDailyNewsSources([...dailyNewsItems, ...favoriteArticles.values()]);
  const totalItems = dailyNewsFavoritesOnly.checked
    ? favoriteArticles.size
    : dailyNewsItems.length;
  dailyNewsFilterCount.textContent = `${items.length} publication${items.length === 1 ? "" : "s"} affichée${items.length === 1 ? "" : "s"} sur ${totalItems}.`;

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "daily-news-empty";
    empty.textContent = dailyNewsFavoritesOnly.checked
      ? "Aucun favori ne correspond aux filtres sélectionnés."
      : dailyNewsItems.length
        ? "Aucune publication ne correspond aux filtres sélectionnés."
        : "Aucune publication récente n’est disponible dans les flux chargés.";
    dailyNewsFeed.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = `daily-news-card daily-news-${item.category || "other"}`;

    const category = document.createElement("span");
    category.className = "daily-news-category";
    category.textContent = dailyCategoryLabels[item.category] || "Publication sanitaire";

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.titleFr || item.title;

    const meta = document.createElement("p");
    meta.className = "daily-news-meta";
    const publisher = item.publisher && item.publisher !== item.source
      ? ` · ${item.publisher}`
      : "";
    meta.textContent = `Source : ${item.source || "Non précisée"}${publisher} · Publication : ${formatPublicationDate(item.publishedAt)}`;

    const note = document.createElement("p");
    note.className = "daily-news-meta";
    note.textContent = dailyCategoryNotes[item.category] || dailyCategoryNotes.humanitarian;

    const favoriteButton = document.createElement("button");
    favoriteButton.className = "favorite-toggle";
    favoriteButton.type = "button";
    const isFavorite = favoriteArticles.has(item.url);
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    favoriteButton.setAttribute("aria-label", `${isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"} : ${item.titleFr || item.title}`);
    favoriteButton.textContent = isFavorite ? "★ Dans mes favoris" : "☆ Ajouter aux favoris";
    favoriteButton.addEventListener("click", () => toggleFavorite(item));

    card.append(category, link, meta, note, favoriteButton);
    dailyNewsFeed.appendChild(card);
  });
}

function renderDailyUpdates() {
  const updates = window.RDC_DAILY_UPDATES;
  if (!updates || !Array.isArray(updates.items)) {
    dailyUpdateStatus.textContent = "Le flux quotidien est indisponible.";
    dailySourceStatus.textContent = "Les autres informations du site restent consultables.";
    dailyNewsItems = [];
    renderDailyNewsItems();
    return;
  }

  if (updates.updatedAt) {
    const updatedAt = new Date(updates.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      dailyUpdateStatus.textContent = "La date de dernière collecte est invalide.";
    } else {
      const formatted = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(updatedAt);
      const stale = Date.now() - updatedAt.getTime() > 36 * 60 * 60 * 1000;
      dailyUpdateStatus.textContent = `Dernière collecte : ${formatted}${stale ? " · actualisation en retard" : ""}`;
      dailyUpdateStatus.classList.toggle("is-stale", stale);
    }
  } else {
    dailyUpdateStatus.textContent = "La première collecte quotidienne sera publiée par GitHub Actions.";
  }

  const sourceResults = Array.isArray(updates.sources) ? updates.sources : [];
  const unavailable = sourceResults
    .filter((source) => source.state === "not_configured" || source.state === "error")
    .map((source) => source.state === "not_configured"
      ? `${source.name} non configuré`
      : `${source.name} indisponible aujourd’hui`);
  const sourceMessages = sourceResults
    .filter((source) => typeof source.name === "string" && typeof source.message === "string")
    .map((source) => `${source.name} : ${source.message}`);
  dailySourceStatus.textContent = sourceMessages.length
    ? sourceMessages.join(" · ")
    : unavailable.length
      ? `Flux facultatifs ou indisponibles : ${unavailable.join(" · ")}.`
      : "";
  dailySourceStatus.classList.toggle("is-warning", unavailable.length > 0);

  dailyNewsItems = updates.items.filter((item) =>
    item && typeof item.title === "string" &&
    typeof item.url === "string" && item.url.startsWith("https://")
  );
  updateDailyNewsSources(dailyNewsItems);
  renderDailyNewsItems();
}

dailyNewsFilters.addEventListener("input", renderDailyNewsItems);
dailyNewsFilters.addEventListener("change", renderDailyNewsItems);
dailyNewsFilters.addEventListener("reset", () => {
  window.setTimeout(renderDailyNewsItems, 0);
});

function setFavoriteStorageStatus(message, isError = false) {
  favoriteStorageStatus.textContent = message;
  favoriteStorageStatus.classList.toggle("is-error", isError);
}

function setAccountStatus(message, isError = false) {
  accountStatus.textContent = message;
  accountStatus.classList.toggle("is-error", isError);
}

function loadLocalFavorites() {
  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    if (!Array.isArray(parsedFavorites)) {
      throw new Error("Les favoris enregistrés n’ont pas le format attendu.");
    }

    localFavoriteArticles = new Map(parsedFavorites
      .filter((item) =>
        item && typeof item.url === "string" && item.url.startsWith("https://") &&
        typeof item.title === "string" && item.title.trim()
      )
      .map((item) => [item.url, item]));
    favoriteArticles = new Map(localFavoriteArticles);
    setFavoriteStorageStatus(`${favoriteArticles.size} favori(s) enregistré(s) dans ce navigateur.`);
  } catch (error) {
    console.error("Impossible de charger les favoris locaux.", error);
    localFavoriteArticles = new Map();
    favoriteArticles = new Map();
    setFavoriteStorageStatus("Les favoris locaux ne sont pas accessibles dans ce navigateur.", true);
  }
}

function saveLocalFavorites(nextFavorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...nextFavorites.values()]));
    localFavoriteArticles = nextFavorites;
    favoriteArticles = new Map(localFavoriteArticles);
    setFavoriteStorageStatus(`${favoriteArticles.size} favori(s) enregistré(s) dans ce navigateur.`);
    return true;
  } catch (error) {
    console.error("Impossible d’enregistrer les favoris locaux.", error);
    setFavoriteStorageStatus("Le navigateur n’a pas pu enregistrer les favoris.", true);
    return false;
  }
}

function loadSupabaseSdk() {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    return Promise.resolve(window.supabase);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js";
    script.onload = () => {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        resolve(window.supabase);
      } else {
        reject(new Error("La bibliothèque Supabase n’a pas pu être initialisée."));
      }
    };
    script.onerror = () => reject(new Error("La bibliothèque Supabase est inaccessible."));
    document.head.appendChild(script);
  });
}

function updateAccountControls() {
  accountForm.hidden = !supabaseClient || Boolean(accountUser);
  accountSignOut.hidden = !accountUser;
  accountPassword.autocomplete = accountUser ? "new-password" : "current-password";
}

function toSupabaseFavorite(item) {
  return {
    user_id: accountUser.id,
    article_url: item.url,
    article_title: item.titleFr || item.title,
    source: item.source || "",
    publisher: item.publisher || "",
    category: item.category || "",
    published_at: item.publishedAt || null
  };
}

function fromSupabaseFavorite(row) {
  return {
    url: row.article_url,
    title: row.article_title,
    source: row.source || "",
    publisher: row.publisher || "",
    category: row.category || "",
    publishedAt: row.published_at || ""
  };
}

async function applyAccountSession(session) {
  accountUser = session && session.user ? session.user : null;
  updateAccountControls();

  if (!accountUser) {
    favoriteArticles = new Map(localFavoriteArticles);
    setFavoriteStorageStatus(`${favoriteArticles.size} favori(s) enregistré(s) dans ce navigateur.`);
    setAccountStatus(supabaseClient
      ? "Connectez-vous ou créez un compte pour synchroniser vos favoris."
      : accountStatus.textContent);
    renderDailyNewsItems();
    return;
  }

  favoriteArticles = new Map(localFavoriteArticles);
  setAccountStatus("Chargement des favoris du compte…");
  try {
    const localRows = [...localFavoriteArticles.values()].map(toSupabaseFavorite);
    if (localRows.length) {
      const { error: importError } = await supabaseClient
        .from("favorites")
        .upsert(localRows, { onConflict: "user_id,article_url", ignoreDuplicates: true });
      if (importError) throw importError;
    }

    const { data, error } = await supabaseClient
      .from("favorites")
      .select("article_url, article_title, source, publisher, category, published_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const remoteFavorites = new Map((data || [])
      .filter((row) => row && typeof row.article_url === "string" && row.article_url.startsWith("https://"))
      .map((row) => {
        const article = fromSupabaseFavorite(row);
        return [article.url, article];
      }));

    if (localRows.length) {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
      localFavoriteArticles.clear();
    }
    favoriteArticles = remoteFavorites;
    setFavoriteStorageStatus(`${favoriteArticles.size} favori(s) synchronisé(s) avec votre compte.`);
    setAccountStatus(`Connecté${accountUser.email ? ` : ${accountUser.email}` : ""}. Vos favoris sont synchronisés.`);
  } catch (error) {
    console.error("Impossible de synchroniser les favoris du compte.", error);
    setAccountStatus(`Connexion établie, mais les favoris n’ont pas pu être chargés : ${error.message}`, true);
    setFavoriteStorageStatus("Les favoris locaux restent disponibles; vérifiez la configuration Supabase et les règles RLS.", true);
  }
  renderDailyNewsItems();
}

async function initializeSupabaseFeatures() {
  if (supabaseInitialization) return supabaseInitialization;
  supabaseInitialization = (async () => {
    const configuration = window.RDC_SUPABASE_CONFIG;
    if (!configuration || !configuration.url || !configuration.anonKey) {
      accountForm.hidden = true;
      setAccountStatus("Comptes non configurés. Ajoutez l’URL du projet et sa clé publique dans data/supabase-config.js, puis appliquez supabase/schema.sql.");
      return;
    }

    try {
      const projectUrl = new URL(configuration.url);
      if (projectUrl.protocol !== "https:" && projectUrl.hostname !== "localhost") {
        throw new Error("L’URL Supabase doit utiliser HTTPS.");
      }
      if (typeof configuration.anonKey !== "string" || !configuration.anonKey.trim()) {
        throw new Error("La clé publique Supabase est invalide.");
      }

      const sdk = await loadSupabaseSdk();
      supabaseClient = sdk.createClient(projectUrl.origin, configuration.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      updateAccountControls();

      accountForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const action = event.submitter && event.submitter.dataset.authAction;
        const email = accountEmail.value.trim();
        const password = accountPassword.value;
        const buttons = [...accountForm.querySelectorAll("button")];
        buttons.forEach((button) => { button.disabled = true; });
        setAccountStatus(action === "sign-up" ? "Création du compte…" : "Connexion…");

        try {
          if (action === "sign-up") {
            const redirectUrl = new URL(window.location.href);
            redirectUrl.hash = "";
            const { data, error } = await supabaseClient.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: redirectUrl.href }
            });
            if (error) throw error;
            setAccountStatus(data.session
              ? "Compte créé et connecté. Vous pouvez maintenant enregistrer vos favoris."
              : "Compte créé. Vérifiez votre e-mail pour confirmer l’inscription avant de vous connecter.");
          } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setAccountStatus("Connexion réussie. Chargement de vos favoris…");
          }
        } catch (error) {
          console.error("Échec de l’authentification Supabase.", error);
          setAccountStatus(`Échec de l’opération : ${error.message}`, true);
        } finally {
          buttons.forEach((button) => { button.disabled = false; });
          accountPassword.value = "";
        }
      });

      accountSignOut.addEventListener("click", async () => {
        accountSignOut.disabled = true;
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) throw error;
          setAccountStatus("Vous êtes déconnecté. Vos favoris de compte resteront disponibles à votre prochaine connexion.");
        } catch (error) {
          console.error("Échec de la déconnexion Supabase.", error);
          setAccountStatus(`La déconnexion n’a pas pu aboutir : ${error.message}`, true);
        } finally {
          accountSignOut.disabled = false;
        }
      });

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event !== "INITIAL_SESSION") {
          window.setTimeout(() => { applyAccountSession(session); }, 0);
        }
      });
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      await applyAccountSession(data.session);
    } catch (error) {
      console.error("Impossible d’initialiser Supabase.", error);
      supabaseClient = null;
      accountForm.hidden = true;
      setAccountStatus(`Le service de compte n’est pas disponible : ${error.message}`, true);
    }
  })();
  return supabaseInitialization;
}

async function toggleFavorite(item) {
  const nextFavorites = new Map(favoriteArticles);
  const isFavorite = nextFavorites.has(item.url);
  const favorite = {
    url: item.url,
    title: item.titleFr || item.title,
    source: item.source || "",
    publisher: item.publisher || "",
    category: item.category || "",
    publishedAt: item.publishedAt || ""
  };

  if (accountUser && supabaseClient) {
    try {
      const request = isFavorite
        ? supabaseClient.from("favorites").delete().eq("article_url", item.url)
        : supabaseClient.from("favorites").insert(toSupabaseFavorite(favorite));
      const { error } = await request;
      if (error) throw error;
      if (isFavorite) nextFavorites.delete(item.url);
      else nextFavorites.set(item.url, favorite);
      favoriteArticles = nextFavorites;
      setFavoriteStorageStatus(`${favoriteArticles.size} favori(s) synchronisé(s) avec votre compte.`);
      renderDailyNewsItems();
    } catch (error) {
      console.error("Impossible de modifier ce favori dans Supabase.", error);
      setFavoriteStorageStatus(`Le favori n’a pas pu être synchronisé : ${error.message}`, true);
    }
    return;
  }

  if (isFavorite) {
    nextFavorites.delete(item.url);
  } else {
    nextFavorites.set(item.url, favorite);
  }

  if (!saveLocalFavorites(nextFavorites)) return;
  renderDailyNewsItems();
}

function loadDailyUpdates() {
  const script = document.createElement("script");
  const cacheDate = new Date().toISOString().slice(0, 10);
  script.src = `data/daily-updates.js?date=${cacheDate}&sync=${Date.now()}`;
  script.addEventListener("load", renderDailyUpdates, { once: true });
  script.addEventListener("error", () => {
    dailyUpdateStatus.textContent = "Le flux quotidien n’a pas pu être chargé.";
    dailySourceStatus.textContent = "Les informations statiques et la carte restent disponibles.";
    console.error("Impossible de charger data/daily-updates.js.");
  }, { once: true });
  document.head.appendChild(script);
}

async function fetchGNews(query) {
  const key = sessionStorage.getItem("gnews-key");
  if (!key) return { available: false, articles: [] };
  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", `${query} (épidémie OR choléra OR Ebola OR mpox OR rougeole)`);
  url.searchParams.set("lang", "fr");
  url.searchParams.set("country", "cd");
  url.searchParams.set("max", "5");
  url.searchParams.set("apikey", key);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GNews répond HTTP ${response.status}`);
  const data = await response.json();
  return {
    available: true,
    articles: (data.articles || []).map((article) => ({
      title: article.title,
      url: article.url,
      date: article.publishedAt,
      publisher: article.source?.name
    }))
  };
}

async function fetchNewsData(query) {
  const key = sessionStorage.getItem("newsdata-key");
  if (!key) return { available: false, articles: [] };
  const url = new URL("https://newsdata.io/api/1/latest");
  url.searchParams.set("apikey", key);
  url.searchParams.set("q", `${query} AND (choléra OR Ebola OR mpox OR rougeole OR épidémie)`);
  url.searchParams.set("language", "fr");
  url.searchParams.set("country", "cd");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NewsData.io répond HTTP ${response.status}`);
  const data = await response.json();
  return {
    available: true,
    articles: (data.results || []).map((article) => ({
      title: article.title,
      url: article.link,
      date: article.pubDate,
      publisher: article.source_name
    }))
  };
}

async function searchProvinceNews(feature) {
  const name = getProvinceName(feature);
  const gnewsKey = sessionStorage.getItem("gnews-key");
  const newsdataKey = sessionStorage.getItem("newsdata-key");
  emptyState.hidden = true;
  newsResults.hidden = false;
  newsResults.replaceChildren();

  const officialCard = createOfficialCard(feature);
  if (officialCard) {
    newsResults.appendChild(officialCard);
  } else {
    const officialStatus = document.createElement("p");
    officialStatus.className = "news-status";
    officialStatus.textContent = "Aucune donnée officielle confirmée ou alertée n’est actuellement chargée pour cette province.";
    newsResults.appendChild(officialStatus);
  }

  if (!gnewsKey && !newsdataKey) {
    const status = document.createElement("p");
    status.className = "news-status";
    status.textContent = "Flux médiatiques non activés. Configurez une clé pour lancer une recherche sur cette province.";
    newsResults.appendChild(status);
    return;
  }

  const status = document.createElement("p");
  status.className = "news-status";
  status.textContent = `Recherche médiatique récente — ${name}. Les résultats ci-dessous ne constituent pas une confirmation officielle.`;
  newsResults.appendChild(status);

  const searches = [
    { name: "GNews", fetcher: fetchGNews },
    { name: "NewsData.io", fetcher: fetchNewsData }
  ];

  await Promise.all(searches.map(async (search) => {
    try {
      const result = await search.fetcher(name);
      if (result.available) {
        newsResults.appendChild(createNewsCard(name, result.articles, search.name));
      }
    } catch (error) {
      console.error(error);
      const card = document.createElement("article");
      card.className = "news-source";
      card.innerHTML = `<h4>${search.name}</h4><p class="news-meta">Flux indisponible : vérifiez la clé, le quota ou l’accès réseau.</p>`;
      newsResults.appendChild(card);
    }
  }));
}

function getProvinceName(feature) {
  const name = feature.properties.shapeName;
  return provinceNames[name] || name;
}

function coordinatesForFeature(feature) {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") {
    return geometry.coordinates;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat();
  }
  return [];
}

function projectCoordinates(features, width, height, padding) {
  const points = [];
  features.forEach((feature) => {
    coordinatesForFeature(feature).forEach((ring) => {
      ring.forEach(([longitude, latitude]) => points.push([longitude, latitude]));
    });
  });
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const scale = Math.min(
    (width - padding * 2) / (maxLongitude - minLongitude),
    (height - padding * 2) / (maxLatitude - minLatitude)
  );
  const drawnWidth = (maxLongitude - minLongitude) * scale;
  const drawnHeight = (maxLatitude - minLatitude) * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;

  return ([longitude, latitude]) => [
    offsetX + (longitude - minLongitude) * scale,
    height - offsetY - (latitude - minLatitude) * scale
  ];
}

function featurePath(feature, project) {
  return coordinatesForFeature(feature)
    .map((ring) => ring.map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ") + " Z")
    .join(" ");
}

function provinceCentroid(feature, project) {
  const rings = coordinatesForFeature(feature);
  let largestRing = rings[0] || [];
  rings.forEach((ring) => {
    if (ring.length > largestRing.length) largestRing = ring;
  });
  if (!largestRing.length) return [0, 0];
  const projected = largestRing.map((point) => project(point));
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  return [
    xs.reduce((sum, value) => sum + value, 0) / xs.length,
    ys.reduce((sum, value) => sum + value, 0) / ys.length
  ];
}

function officialDiseaseLabel(feature) {
  const records = getOfficialRecords(feature)
    .filter((record) => record.status === "confirmed" || record.status === "alert");
  if (!records.length) return "";
  return records.map((record) => record.mapLabel || record.disease).join(" · ");
}

function selectCity(record, marker) {
  selectedFeatureId = null;
  map.querySelectorAll(".province-shape").forEach((shape) => {
    shape.classList.remove("is-selected");
    shape.setAttribute("aria-pressed", "false");
  });
  provinceList.querySelectorAll(".province-button").forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });
  map.querySelectorAll(".city-marker").forEach((item) => {
    item.classList.toggle("is-selected", item === marker);
  });
  if (marker) {
    const point = marker.querySelector(".city-marker-dot");
    if (point) {
      zoomMapToPoint(Number(point.getAttribute("cx")), Number(point.getAttribute("cy")));
    }
  }

  detailTitle.textContent = record.name;
  detailCopy.textContent = `${record.province} · ${record.disease} · ${record.statusLabel}`;
  selectedLegend.textContent = `${record.name} — ${record.statusLabel}`;
  newsResults.replaceChildren();
  newsResults.hidden = false;
  emptyState.hidden = true;

  const card = document.createElement("article");
  card.className = "news-source";
  card.classList.add(`city-status-${record.status}`);
  const heading = document.createElement("h4");
  const headings = {
    ongoing: "Transmission signalée",
    controlled: "Foyer initial contrôlé",
    community: "Mobilisation communautaire rapportée",
    access: "Incident affectant l’accès à la riposte",
    indicator: "Indicateur provincial — pas une confirmation d’épidémie",
    provincial: "Contexte provincial — la source ne précise pas les cas par ville"
  };
  heading.textContent = headings[record.status] || "Information rapportée";
  const link = document.createElement("a");
  link.href = record.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = record.disease;
  const meta = document.createElement("p");
  meta.className = "news-meta";
  const areaMeta = record.status === "indicator" || record.status === "provincial"
    ? `Repère : ${record.name} · Niveau des données : province du ${record.province}`
    : `Ville/localité : ${record.name} · Province : ${record.province}`;
  meta.textContent = `${areaMeta} · Source : ${record.source} · Publication : ${formatPublicationDate(record.date)}`;
  const note = document.createElement("p");
  note.className = "news-meta";
  note.textContent = `${record.note} Situation rapportée à la date de publication ; elle peut évoluer.`;
  card.append(heading, link, meta, note);
  newsResults.appendChild(card);

  if (marker) marker.focus();
}

function addCityMarkers(project) {
  const cities = Array.isArray(window.RDC_CITY_HEALTH_DATA)
    ? window.RDC_CITY_HEALTH_DATA
    : [];
  cities.forEach((record) => {
    const [x, y] = project([record.longitude, record.latitude]);
    const offset = record.labelOffset || [10, 3];
    const labelX = x + offset[0];
    const labelY = y + offset[1];
    const statusClasses = {
      ongoing: "city-marker-ongoing",
      controlled: "city-marker-controlled",
      community: "city-marker-community",
      access: "city-marker-access",
      indicator: "city-marker-indicator",
      provincial: "city-marker-provincial"
    };
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `city-marker ${statusClasses[record.status] || "city-marker-community"}`);
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", `${record.name}, ${record.province} : ${record.statusLabel}`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "city-marker-dot");
    circle.setAttribute("cx", x.toFixed(2));
    circle.setAttribute("cy", y.toFixed(2));
    circle.setAttribute("r", record.status === "ongoing" || record.status === "access" ? "7" : "5.5");

    const connector = document.createElementNS("http://www.w3.org/2000/svg", "line");
    connector.setAttribute("class", "city-marker-connector");
    connector.setAttribute("x1", x.toFixed(2));
    connector.setAttribute("y1", y.toFixed(2));
    connector.setAttribute("x2", (labelX + (offset[0] < 0 ? 2 : -2)).toFixed(2));
    connector.setAttribute("y2", (labelY - 2).toFixed(2));
    group.appendChild(connector);
    group.appendChild(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "city-marker-label");
    label.setAttribute("x", labelX.toFixed(2));
    label.setAttribute("y", labelY.toFixed(2));
    label.setAttribute("text-anchor", offset[0] < 0 ? "end" : "start");
    label.textContent = record.name;
    group.appendChild(label);

    group.addEventListener("click", () => selectCity(record, group));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCity(record, group);
      }
    });
    map.appendChild(group);
  });
}

function selectProvince(feature, path) {
  selectedFeatureId = feature.properties.shapeID;
  if (path) {
    zoomMapToBounds(path.getBBox());
  }
  map.querySelectorAll(".province-shape").forEach((shape) => {
    const isSelected = shape.dataset.featureId === selectedFeatureId;
    shape.classList.toggle("is-selected", isSelected);
    shape.setAttribute("aria-pressed", String(isSelected));
  });
  provinceList.querySelectorAll(".province-button").forEach((button) => {
    const isSelected = button.dataset.featureId === selectedFeatureId;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  const name = getProvinceName(feature);
  detailTitle.textContent = name;
  detailCopy.textContent = "Zone administrative sélectionnée en République démocratique du Congo.";
  selectedLegend.textContent = name;
  if (!getOfficialRecords(feature).length) {
    selectedLegend.textContent = `${name} — aucune donnée officielle chargée`;
  }
  searchProvinceNews(feature);
  if (path) {
    path.focus();
  }
}

function addProvince(feature, project) {
  const name = getProvinceName(feature);
  const featureId = feature.properties.shapeID;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "province-shape");
  path.setAttribute("d", featurePath(feature, project));
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("role", "button");
  path.setAttribute("tabindex", "0");
  path.setAttribute("aria-label", `Sélectionner la province ${name}`);
  path.setAttribute("aria-pressed", "false");
  path.dataset.featureId = featureId;
  path.addEventListener("click", () => selectProvince(feature, path));
  path.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectProvince(feature, path);
    }
  });
  map.appendChild(path);

  const [labelX, labelY] = provinceCentroid(feature, project);
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "province-label");
  label.setAttribute("x", labelX.toFixed(2));
  label.setAttribute("y", labelY.toFixed(2));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("aria-hidden", "true");
  label.setAttribute("pointer-events", "none");
  label.textContent = name;
  map.appendChild(label);

  const diseaseLabel = officialDiseaseLabel(feature);
  if (diseaseLabel) {
    const healthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    healthLabel.setAttribute("class", "health-label");
    healthLabel.setAttribute("x", labelX.toFixed(2));
    healthLabel.setAttribute("y", (labelY + 13).toFixed(2));
    healthLabel.setAttribute("text-anchor", "middle");
    healthLabel.setAttribute("aria-hidden", "true");
    healthLabel.setAttribute("pointer-events", "none");
    healthLabel.textContent = diseaseLabel;
    map.appendChild(healthLabel);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "province-button";
  button.textContent = name;
  button.dataset.featureId = featureId;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => selectProvince(feature, path));
  provinceList.appendChild(button);
}

function loadProvinces() {
  try {
    const data = window.RDC_PROVINCES;
    if (!data || !Array.isArray(data.features) || data.features.length === 0) {
      throw new Error("Le jeu de données ne contient aucune province.");
    }

    const project = projectCoordinates(data.features, 820, 740, 24);
    data.features
      .slice()
      .sort((a, b) => getProvinceName(a).localeCompare(getProvinceName(b), "fr"))
      .forEach((feature) => addProvince(feature, project));
    addCityMarkers(project);
    const localityCount = Array.isArray(window.RDC_CITY_HEALTH_DATA)
      ? window.RDC_CITY_HEALTH_DATA.length
      : 0;
    mapCount.textContent = `${data.features.length} provinces · ${localityCount} repères`;
    applyOfficialMapStatus();
  } catch (error) {
    console.error(error);
    mapCount.textContent = "Carte indisponible";
    mapError.hidden = false;
  }
}
