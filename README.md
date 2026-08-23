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

- `index.html` — fertige Seite
- `assets/` — JS/CSS
- `favicon.svg`

Die Quell-HTML für die Entwicklung bleibt in `index.source.html`.

```bash
npm run preview
```

serviert die Root-Build-Ausgabe lokal.
