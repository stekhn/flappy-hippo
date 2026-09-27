# Flappy Hippo

Ein fliegendes Nilpferd, eine Taste, kein Konto. Flappy Hippo läuft komplett im Browser, lässt sich
auf dem Handy als App installieren und funktioniert danach auch offline.

**Spielen: https://stekhn.github.io/flappy-hippo/**

## Features

- **Eine Steuerung**: tippen, klicken oder Leertaste. Mehr braucht es nicht.
- **Drei Schwierigkeitsstufen**, die mit steigender Punktzahl schneller und enger werden.
- **Melonen und Schilde**: Melonen hängen zwischen den Röhren und bringen drei Punkte, die Blase
  hält genau einen Treffer aus.
- **Rekorde, Medaillen und zwölf Erfolge** — alles lokal, ohne Konto und ohne Server. Fällt der
  Rekord mitten im Flug, färbt sich die Anzeige gold; ein Erfolg meldet sich in dem Moment, in
  dem er erreicht ist, als Toast am unteren Rand — wie auf der Konsole, nicht erst nach dem Absturz.
- **Pause mit Countdown**: App-Wechsel oder Anruf kosten keine Runde; weiter geht es mit 3-2-1.
- **Tag und Nacht**: Sonne, Mond, Sterne und beleuchtete Fenster, gekoppelt an das System-Design.
- **Für Handys gebaut**: füllt den Bildschirm inklusive Notch, pausiert beim App-Wechsel, Ton und
  Vibration lassen sich abschalten.
- **Offline spielbar** und als PWA installierbar. Ein Ergebnis lässt sich über das Teilen-Menü des
  Systems weitergeben — mehr Verbindung nach außen gibt es nicht.

## Quick start

Node >= 22.

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173
npm run build    # statisches Bundle in dist/
npm run preview  # das gebaute Bundle unter /flappy-hippo/ ansehen
npm test         # Spiellogik (Node Test Runner)
npm run lint     # oxlint
npm run icons    # assets/*.svg → public/*.png (nur nach Icon-Änderungen nötig)
```

Der Build ist eine reine statische Seite: `dist/` auf einen beliebigen Webserver legen, fertig. Zur
Laufzeit gibt es keine Netzwerkaufrufe.

## Deployment

Jeder Push auf `main` baut und veröffentlicht über
[GitHub Actions](.github/workflows/deploy.yml) auf GitHub Pages — derselbe Ablauf wie bei
[punchpath](https://github.com/stekhn/punchpath). Der Workflow lintet, testet, baut und lädt `dist/`
als Pages-Artefakt hoch; `enablement: true` schaltet Pages beim ersten Lauf selbst ein.

Einmalig nötig:

1. Repository auf GitHub anlegen und pushen:
   ```bash
   git remote add origin git@github.com:stekhn/flappy-hippo.git
   git push -u origin main
   ```
2. Unter **Settings → Pages → Build and deployment** als Source **GitHub Actions** wählen.

Das Spiel wird als Projektseite unter `/flappy-hippo/` ausgeliefert; der Pfad steht als `base` in
[vite.config.ts](vite.config.ts). Bei einer eigenen Domain oder einer User-Page dort auf `/` stellen.

## So funktioniert es

Der Kern ist eine kleine, DOM-freie Simulation: `advance()` bekommt den Zustand, ein Zeitdelta und
die Spielwelt und meldet zurück, was passiert ist. Darum herum liegt eine Laufzeit, die das Canvas,
den Animation Frame und die Eingaben besitzt, und darüber React für HUD, Karten und Menü. React
rendert nie ein Einzelbild — es bekommt nur dann einen Schnappschuss, wenn sich etwas ändert, das
es anzeigt. Steht die Szene still (Pause, Menü, ausgeklungener Game-Over-Bildschirm), wird auch
nichts mehr gezeichnet; wer weniger Bewegung eingestellt hat, bekommt sie auch im Canvas.

### Das Spielfeld passt sich an

Statt ein festes 3:2-Bild in jedes Gerät zu quetschen, behält das Spielfeld **eine konstante kurze
Seite** (320 Welt-Einheiten) und lässt die lange Seite dem Bildschirm folgen. Eine Lücke von 130
Einheiten ist dadurch überall dieselbe Aufgabe: Ein Handy im Hochformat bekommt einfach mehr Himmel
über und unter sich, ein Laptop mehr Anlauf nach vorn. Ab einer bestimmten Größe hört die
Vergrößerung auf, und das Spielfeld sitzt als gerahmte Karte auf der Seite.

## Gestaltung

Die Oberfläche soll sich anfühlen wie ein Teil des Spiels, nicht wie eine Verwaltungsmaske davor.
Zwei Schriften, beide selbst gehostet (siehe [public/fonts](public/fonts/README.md)): **Fredoka**
für alles, was zum Spiel gehört — Titel, Zahlen, Knöpfe, Reiter —, **Nunito** für den Fließtext.
Fünf Textrollen (`t-title`, `t-heading`, `t-label`, `t-number`, `t-hint`) reichen für jeden
Bildschirm. Alle Overlays — Karten, Menü, Toasts — liegen auf derselben frostigen Glasfläche
(`glass`), und Knöpfe haben eine feste Unterseite und sinken beim Drücken ein. Die Tokens dafür
stehen in [src/styles.css](src/styles.css) und speisen auch die Canvas-Palette.

## Projektstruktur

```
src/game/          Simulation, Zustand, Laufzeit, Ton — ohne React
src/game/render/   Canvas-Zeichenroutinen (Nilpferd, Röhren, Kulisse, Effekte)
src/components/    React-Oberfläche: HUD, Karten, Menü
src/hooks/         Laufzeit-Anbindung, Einstellungen, Fortschritt, Installations-Prompt
assets/            Icon-Quellen (SVG) für scripts/make-icons.ts
```

## Herkunft

Das Spiel begann als Wartungsseiten-Easteregg in einer internen Next.js-App und ist hier zu einer
eigenständigen Web-App geworden: eigenes Spielfeld-Modell für Hochformat, Aufsammelobjekte,
Schwierigkeitsstufen, Ton, Rekorde, Erfolge und Offline-Betrieb.
