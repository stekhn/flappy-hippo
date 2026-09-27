# Flappy Hippo

Ein fliegendes Nilpferd, eine Taste, kein Konto. Flappy Hippo läuft komplett im Browser, lässt sich
auf dem Handy als App installieren und funktioniert danach auch offline.

**Spielen: https://stekhn.github.io/flappy-hippo/**

## Features

- **Eine Steuerung**: tippen, klicken oder Leertaste. Mehr braucht es nicht.
- **Drei Schwierigkeitsstufen**, die mit steigender Punktzahl schneller und enger werden. Ab 100
  Punkten fallen Blumentöpfe von den Balkonen, ab 200 wandern manche Röhren auf und ab. Beides
  kündigt sich an und lässt sich mit Können umfliegen: Sterben ist nie Zufall.
- **Melonen und Schilde**: Melonen hängen zwischen den Röhren und bringen drei Punkte, die Blase
  hält genau einen Treffer aus.
- **Rekorde, Medaillen und 22 Erfolge**, zehn davon verborgen, bis man ihnen nahe kommt — alles lokal, ohne Konto und ohne Server. Fällt der
  Rekord mitten im Flug, färbt sich die Anzeige gold; ein Erfolg meldet sich in dem Moment, in
  dem er erreicht ist, als Toast am unteren Rand — wie auf der Konsole, nicht erst nach dem Absturz.
- **Pause mit Countdown**: App-Wechsel oder Anruf kosten keine Runde; weiter geht es mit 3-2-1.
- **Tag und Nacht**: Sonne, Mond, Sterne und beleuchtete Fenster, gekoppelt an das System-Design.
- **Für Handys gebaut**: füllt den Bildschirm inklusive Notch, pausiert beim App-Wechsel, Ton und
  Vibration lassen sich abschalten.
- **Eine richtige App**: installierbar auf Handy und Desktop, offline spielbar, mit Startbild auf
  dem iPhone, Screenshots im Installationsdialog und Verknüpfungen zu Rekorden und Erfolgen. Eine
  neue Version wird angeboten, nie mitten in der Runde erzwungen. Ein Ergebnis lässt sich über das
  Teilen-Menü des Systems weitergeben — mehr Verbindung nach außen gibt es nicht.

## Quick start

Node >= 22.

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173
npm run build    # statisches Bundle in dist/
npm run preview  # das gebaute Bundle unter /flappy-hippo/ ansehen
npm test         # Spiellogik (Node Test Runner)
npm run lint     # oxlint
npm run assets   # assets/*.svg → Icons, Favicon, iOS-Startbilder (nur nach Änderungen an den SVGs)
npm run screenshots  # Manifest-Screenshots aus der laufenden App (braucht Chrome, s. u.)
```

Der Build ist eine reine statische Seite: `dist/` auf einen beliebigen Webserver legen, fertig. Zur
Laufzeit gibt es keine Netzwerkaufrufe.

## Als App

Flappy Hippo erfüllt alles, was Chrome, Safari und Edge für eine installierbare Web-App verlangen,
und das, was den Unterschied zu einer bloßen Webseite macht:

- **Manifest** mit `id`, Name, Beschreibung, Kategorien, `launch_handler` (ein zweiter Tipp aufs
  Icon holt das laufende Spiel zurück) und Verknüpfungen zu *Rekorde* und *Erfolge*.
- **Icons** in allen Rollen: normal, *maskable* (Kopf in der 80-%-Sicherheitszone, für runde und
  eckige Launcher), *monochrome* (für Android-Themen und Badges), Apple-Touch-Icon, SVG- und
  PNG-Favicon, Safari-Pinned-Tab. Quelle sind die SVGs in `assets/`, gerendert von
  `scripts/make-assets.ts`.
- **Screenshots** im Manifest — vier im Hochformat für Android, zwei im Querformat für den
  Desktop — damit der Installationsdialog aussieht wie ein Store-Eintrag. Sie werden mit
  `scripts/make-screenshots.ts` aus der echten App aufgenommen (Chrome oder Chromium nötig;
  `CHROME_PATH=/pfad/zu/chrome npm run screenshots`, sonst wird an den üblichen Orten gesucht).
- **Startbilder für iOS** für gängige iPhones und iPads, Hoch- und Querformat, hell und dunkel —
  sonst zeigt Safari beim Start einer installierten App eine weiße Fläche. `npm run assets`
  erzeugt sie und schreibt die `<link>`-Tags in `index.html`.
- **Service Worker** (Workbox über `vite-plugin-pwa`): das Spiel ist nach dem ersten Besuch
  vollständig offline. Eine neue Version meldet sich als Hinweis mit *Neu laden* und wartet — ein
  Reload mitten im Flug würde die Runde kosten. Screenshots und Startbilder sind vom Precache
  ausgenommen.
- **Teilen-Metadaten** (Open Graph, Twitter Card, kanonische URL), damit ein geteilter Link mit
  Bild und Beschreibung erscheint.

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

### Zeichnen mit Budget

Ein Side-Scroller zeigt jedes Bild dieselbe Kulisse, nur verschoben. Deshalb werden die stillen
Ebenen (Skylines, Hecke mit Laternen, Mauer mit Straße) einmal in Bitmaps gebacken, eine
Szenenperiode breit in Geräteauflösung, und pro Bild nur noch zwei-, dreimal an der Scrollposition
eingeblendet ([src/game/render/layers.ts](src/game/render/layers.ts)). Gezeichnet wird pro Bild
nur, was sich bewegt: Himmelskörper, Röhren, Blumentöpfe, Sammelobjekte, das Nilpferd, dazu das seltene
Straßenmobiliar (Bank, Briefkasten, Mülleimer, ab und zu eine Katze oder ein Hund), das nicht
gebacken wird, damit es sich nie wiederholt: Was an welcher Stelle steht, ergibt sich aus ihrer
Nummer, nicht aus einer Liste. Die Auflösung ist auf 2x
gedeckelt, und hält ein Gerät trotzdem keine 60 fps, geht sie stufenweise herunter.

### Das Spielfeld passt sich an

Statt ein festes 3:2-Bild in jedes Gerät zu quetschen, behält das Spielfeld **eine konstante kurze
Seite** (320 Welt-Einheiten) und lässt die lange Seite dem Bildschirm folgen. Eine Lücke von 130
Einheiten ist dadurch überall dieselbe Aufgabe: Ein Handy im Hochformat bekommt einfach mehr Himmel
über und unter sich, ein Laptop mehr Anlauf nach vorn. Damit das hohe Feld nicht schwerer wird,
darf jede neue Lücke nur einen begrenzten Schritt über oder unter der vorigen liegen — wie weit,
bestimmt allein die Schwierigkeitsstufe, nicht die Bildschirmform. Ab einer bestimmten Größe hört
die Vergrößerung auf, und das Spielfeld sitzt als gerahmte Karte auf der Seite.

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
dev/               Pose-Labor: `npm run dev`, dann /dev/poses.html — Kontaktbogen der Nilpferd-Posen
docs/              der gerenderte Kontaktbogen (defeat-poses.png)
```

## Herkunft

Das Spiel begann als Wartungsseiten-Easteregg in einer internen Next.js-App und ist hier zu einer
eigenständigen Web-App geworden: eigenes Spielfeld-Modell für Hochformat, Aufsammelobjekte,
Schwierigkeitsstufen, Ton, Rekorde, Erfolge und Offline-Betrieb.
