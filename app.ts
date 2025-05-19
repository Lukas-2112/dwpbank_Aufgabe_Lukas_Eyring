interface Wertpapier {
  wkn: string;
  isin: string;
  name: string;
  typ: string;
  kurs: number;
  anlagerisiko: string;
  datum_naechste_hauptversammlung: string;
  emittent: string;
}

// Referenzen auf HTML-Elemente im Dokument
const tableBody = document.getElementById("wp-tabelle")!;
const favBody = document.getElementById("favoriten-tabelle")!;
const vergleichCanvas = document.getElementById("vergleich-chart") as HTMLCanvasElement;

const FAVORIT_KEY = "favoriten";
const VERGLEICH_KEY = "vergleich";

let globalData: Wertpapier[] = [];
let vergleichChartInstance: any = null;
let currentSort: { key: string; dir: "asc" | "desc" } | null = null;
let currentFavSort: { key: string; dir: "asc" | "desc" } | null = null;
const COLOR_PALETTE = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#f44336", "#00bcd4", "#8bc34a", "#e91e63"];
const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const RISK_RANK: Record<string, number> = { hoch: 3, mittel: 2, niedrig: 1 };

// Favoriten & Vergleichslisten aus dem Browser-Storage
const getFavoriten = (): string[] => JSON.parse(localStorage.getItem(FAVORIT_KEY) || "[]");
const setFavoriten = (list: string[]) => localStorage.setItem(FAVORIT_KEY, JSON.stringify(list));
const getVergleichsWKNs = (): string[] => JSON.parse(localStorage.getItem(VERGLEICH_KEY) || "[]");
const setVergleichsWKNs = (list: string[]) => localStorage.setItem(VERGLEICH_KEY, JSON.stringify(list));

// Hilfsfunktionen für Charts und Farben
// Generiert 12 simulierte Monatswerte ausgehend vom aktuellen Kurs
function generateChartData(base: number): number[] {
  return Array.from({ length: 12 }, (_, i) => +(base + Math.sin(i / 1.5) * 1.5).toFixed(2));
}

function getColor(index: number): string {
  // Gibt eine Farbe aus der Farbpalette zurück (wird für Diagrammlinien verwendet)
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

// Gemeinsame Sortierfunktion für Haupt- und Favoritentabelle
function sortList(data: Wertpapier[], sortConfig: { key: string; dir: "asc" | "desc" } | null): Wertpapier[] {
  if (!sortConfig) return data;
  const sorted = [...data];
  const { key, dir } = sortConfig;
  // Nach Kurs (numerisch) oder Anlagerisiko (mit vordefinierter Rangfolge) sortieren, sonst alphabetisch
  sorted.sort((a, b) => {
    if (key === "kurs") {
      return dir === "asc" ? a.kurs - b.kurs : b.kurs - a.kurs;
    }
    if (key === "risiko") {
      const av = a.anlagerisiko.toLowerCase();
      const bv = b.anlagerisiko.toLowerCase();
      return dir === "asc" ? RISK_RANK[av] - RISK_RANK[bv] : RISK_RANK[bv] - RISK_RANK[av];
    }
    const aVal = a[key as keyof Wertpapier].toString();
    const bVal = b[key as keyof Wertpapier].toString();
    return dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  return sorted;
}

// Kleines Sparkline-Chart im Tabellenfeld zeichnen
function renderMiniChart(canvasId: string, data: number[]) {
  const ctx = (document.getElementById(canvasId) as HTMLCanvasElement)?.getContext("2d");
  if (!ctx) return;

  const isUp = data[data.length - 1] >= data[0];

  new (window as any).Chart(ctx, {
    type: "line",
    data: {
      labels: Array(data.length).fill(""),
      datasets: [
        {
          data,
          borderColor: isUp ? "#4caf50" : "#e53935",
          backgroundColor: "transparent",
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Monat",
            color: "#333",
            font: { weight: "bold" },
          },
          ticks: {
            callback: (_val: any, idx: number) => MONTH_LABELS[idx],
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Kurs in Euro (€)",
            color: "#333",
            font: { weight: "bold" },
          },
        },
      },
    },
  });
}

// Zeichnet den großen Vergleichs-Chart für ausgewählte Wertpapiere
function renderVergleichChart(data: Wertpapier[]) {
  const hinweis = document.getElementById("vergleich-hinweis") as HTMLParagraphElement;

  // Vorherigen Chart entfernen, falls vorhanden
  if (vergleichChartInstance) {
    vergleichChartInstance.destroy();
    vergleichChartInstance = null;
  }
  if (!vergleichCanvas) return;

  if (data.length === 0) {
    hinweis.style.display = "block";
    return;
  } else {
    hinweis.style.display = "none";
  }

  const ctx = vergleichCanvas.getContext("2d");
  if (!ctx) return;

  const datasets = data.map((wp, i) => ({
    label: wp.name,
    data: generateChartData(wp.kurs),
    borderColor: getColor(i),
    backgroundColor: "transparent",
    tension: 0.4,
    pointRadius: 0,
  }));

  vergleichChartInstance = new (window as any).Chart(ctx, {
    type: "line",
    data: {
      labels: Array(12).fill(""),
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Monat",
            color: "#333",
            font: { weight: "bold" },
          },
          ticks: {
            callback: (_val: any, idx: number) => MONTH_LABELS[idx],
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Kurs in Euro (€)",
            color: "#333",
            font: { weight: "bold" },
          },
        },
      },
    },
  });
}

// Aktualisiert die Favoriten-Ansicht (Tabelle und Chart) basierend auf gespeicherten Favoriten und Vergleichsauswahl
function renderFavoriten(data: Wertpapier[]) {
  const favoriten = getFavoriten();
  const vergleichen = getVergleichsWKNs();

  const favData = data.filter((wp) => favoriten.includes(wp.wkn));
  const compareData = data.filter((wp) => vergleichen.includes(wp.wkn));

  renderFavoritenTabelle(favData);
  renderVergleichChart(compareData);
}

// Baut die Favoriten-Tabelle aus den gegebenen Wertpapieren
// (Entfernen-Buttons nutzen Delegation, siehe unten)
function renderFavoritenTabelle(data: Wertpapier[]) {
  favBody.innerHTML = "";
  const sorted = sortList(data, currentFavSort);
  const vergleichen = getVergleichsWKNs();

  sorted.forEach((wp) => {
    const isVergleich = vergleichen.includes(wp.wkn);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wp.name}</td>
      <td>${wp.typ}</td>
      <td>${wp.kurs.toFixed(2)} €</td>
      <td>${wp.anlagerisiko}</td>
      <td><button class="btn details-btn">Details</button></td>
      <td><button class="btn btn-secondary" data-wkn="${wp.wkn}">Entfernen</button></td>
      <td><input type="checkbox" class="vergleich-check" data-wkn="${wp.wkn}" ${isVergleich ? "checked" : ""}></td>
    `;
    // (Details-Button Event-Listener wird global behandelt)
    favBody.appendChild(tr);
  });
}

// Baut die Haupttabelle mit allen Wertpapieren, Favoriten-Buttons und Vergleichs-Checkboxen
function renderTable(data: Wertpapier[]) {
  tableBody.innerHTML = "";
  const favoriten = getFavoriten();
  const vergleichen = getVergleichsWKNs();
  const sortedData = sortList(data, currentSort);

  sortedData.forEach((wp) => {
    const canvasId = `chart-${wp.wkn}`;
    const kursverlauf = generateChartData(wp.kurs);
    const isFav = favoriten.includes(wp.wkn);
    const isVergleich = vergleichen.includes(wp.wkn);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wp.name}</td>
      <td>${wp.typ}</td>
      <td>${wp.kurs.toFixed(2)} €</td>
      <td><canvas id="${canvasId}" width="250" height="140"></canvas></td>
      <td>${wp.anlagerisiko}</td>
      <td><button class="btn details-btn">Details</button></td>      
      <td><button class="btn btn-secondary" data-wkn="${wp.wkn}">${isFav ? "Entfernen" : "Merken"}</button></td>
      <td><input type="checkbox" class="vergleich-check" data-wkn="${wp.wkn}" ${isVergleich ? "checked" : ""}></td>
      
    `;
    // (Details-Button Event-Listener wird global behandelt)
    tableBody.appendChild(tr);

    renderMiniChart(canvasId, kursverlauf);
  });
}

let activeTyp = "";
let activeRisiko = "";

// Filtert die globale Wertpapierliste nach Suchbegriff, Typ und Risiko und aktualisiert die Tabelle
function applyFilter() {
  const suche = (document.querySelector("#search") as HTMLInputElement).value.toLowerCase();

  const filtered = globalData.filter(
    (wp) =>
      (activeTyp === "" || wp.typ.toLowerCase() === activeTyp.toLowerCase()) &&
      (activeRisiko === "" || wp.anlagerisiko.toLowerCase() === activeRisiko.toLowerCase()) &&
      (suche === "" || wp.name.toLowerCase().includes(suche))
  );

  renderTable(filtered);
}

// Event-Listener für Suchfeld
document.querySelector("#search")?.addEventListener("input", applyFilter);

// Filter-Buttons für Wertpapier-Typ
document.querySelectorAll(".tab-group[data-filter='typ'] button").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeTyp = (btn as HTMLElement).dataset.value!;
    document.querySelectorAll(".tab-group[data-filter='typ'] button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter();
  });
});

// Filter-Buttons für Anlagerisiko
document.querySelectorAll(".tab-group[data-filter='risiko'] button").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeRisiko = (btn as HTMLElement).dataset.value!;
    document.querySelectorAll(".tab-group[data-filter='risiko'] button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter();
  });
});

// Sortierung der Haupttabelle (alle Wertpapiere)
document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = (th as HTMLElement).dataset.sort!;
    if (currentSort?.key === key) {
      currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
    } else {
      currentSort = { key, dir: "asc" };
    }
    renderTable(globalData);
  });
});

// Sortierung der Favoriten-Tabelle
document.querySelectorAll("th[data-favsort]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = (th as HTMLElement).dataset.favsort!;
    if (currentFavSort?.key === key) {
      currentFavSort.dir = currentFavSort.dir === "asc" ? "desc" : "asc";
    } else {
      currentFavSort = { key, dir: "asc" };
    }
    renderFavoriten(globalData);
  });
});

// Favoriten-Buttons (Merken/Entfernen) – Event-Delegation für dynamische Tabelle
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target.matches(".btn[data-wkn]") && !target.matches(".details-btn")) {
    // Wertpapier zur Favoritenliste hinzufügen oder entfernen
    const wkn = target.dataset.wkn!;
    const favs = getFavoriten();
    const updated = favs.includes(wkn) ? favs.filter((f) => f !== wkn) : [...favs, wkn];
    setFavoriten(updated);
    renderTable(globalData);
    renderFavoriten(globalData);
  }
  if (target.matches(".details-btn")) {
    // Detail-Modal öffnen mit den Daten des geklickten Wertpapiers
    const wkn = target.closest("tr")?.querySelector("[data-wkn]")?.getAttribute("data-wkn");
    const wp = globalData.find((wp) => wp.wkn === wkn);
    if (wp) openDetailModal(wp);
  }
});

// Vergleichs-Checkbox – Event-Delegation für dynamische Tabelle
document.addEventListener("change", (e) => {
  const cb = e.target as HTMLInputElement;
  if (cb.matches(".vergleich-check")) {
    // Wertpapier zur Vergleichsliste hinzufügen oder entfernen
    const wkn = cb.dataset.wkn!;
    const selected = getVergleichsWKNs();
    const updated = cb.checked ? [...selected, wkn] : selected.filter((f) => f !== wkn);
    setVergleichsWKNs(updated);

    // Beide Tabellen neu rendern!
    renderTable(globalData);
    renderFavoriten(globalData);
  }
});

// Initialisieren – Daten laden und erste Darstellung
fetch("./data.json")
  .then((res) => res.json())
  .then((data: Wertpapier[]) => {
    globalData = data;
    renderTable(data);
    renderFavoriten(data);
  });

// Öffnet das Detail-Modal und zeigt die übergebenen Wertpapierdaten an
function openDetailModal(wp: Wertpapier): void {
  const get = (id: string) => document.getElementById(id);
  get("modal-title")!.textContent = wp.name;
  get("modal-kurs")!.textContent = wp.kurs.toFixed(2) + " €";
  get("modal-typ")!.textContent = wp.typ;
  get("modal-risiko")!.textContent = wp.anlagerisiko;
  get("modal-emittent")!.textContent = wp.emittent;
  get("modal-isin")!.textContent = wp.isin;
  get("modal-wkn")!.textContent = wp.wkn;
  get("modal-dnhv")!.textContent = wp.datum_naechste_hauptversammlung;
  get("detail-modal")!.style.display = "flex";
}

// Modal schließen bei Klick auf "X" oder Escape-Taste
document.getElementById("modal-close")?.addEventListener("click", () => {
  document.getElementById("detail-modal")!.style.display = "none";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("detail-modal")!.style.display = "none";
  }
});
