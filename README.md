# Wertpapier Vergleich

Eine einfache Webanwendung, die Klaus Meier bei dem Vergleich und der Auswahl von Wertpapieren unterstützen soll.

Die Anwendung ist in TypeScript umgesetzt und nutzt Chart.js für die grafische Darstellung von Liniencharts die zur Veranschaulichung dienen. Sie basieren auf ausgedachten fiktiven Werten.

## Projektstruktur

- `app.ts` – Hauptlogik der Anwendung (TypeScript)
- `data.json` – Datengrundlage für Wertpapiere
- `index.html` – Hauptansicht
- `styles.css` – Layout und Design
- `compiled/` – Zielverzeichnis für kompilierte Dateien (nicht versioniert)
- `tsconfig.json` – TypeScript-Konfiguration

## Voraussetzungen

- Falls noch nicht vorhanden: Node.js und npm (wird mit Node.js mitgeliefert) installieren https://nodejs.org/en
- Node.js installer/setup wizard ausführen (es reicht die standardversion, also Node.js runtime) zu installieren

## Installation

1. Repository klonen:

   https://github.com/Lukas-2112/Wertpapier_Vergleich

   1.1. Oder als zip Datei herunterladen, entpacken und einer IDE öffnen

2. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

## Kompilieren

Den TypeScript-Code in funktionsfähigen JavaScript Code kompilieren:

```bash
npm run build
```

Der kompilierte Code wird im Ordner `compiled/` abgelegt.

## Lokalen Server starten

Um das Projekt lokal im Browser zu starten:

```bash
npm run start
```

Die Anwendung ist anschließend unter der angegebenen `localhost`-Adresse erreichbar (z. B. http\://localhost:3000).

