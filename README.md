# fantrixx

Schlichte, mysteriöse One-Page-Website mit dem Schriftzug **fantrixx** und animiertem Nachtmeer-Hintergrund.

## Lokal starten

```bash
npm install
npm run dev
```

Dann im Browser die angezeigte Adresse öffnen (Port `43127`).

Die Entwicklungs-HTML liegt in `index.source.html`. Der Dev-Server liefert sie unter `/`.

## Build

```bash
npm run build
```

Die gebauten Dateien landen direkt im Repository-Root:

- `index.html`
- `assets/` (JS/CSS)
- `favicon.svg` (aus `public/`)

```bash
npm run preview
```

startet eine Vorschau der Root-Build-Ausgabe.
