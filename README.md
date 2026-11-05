# Luxlens

Produktseite für die Brillenmarke **Luxlens** mit der Fassung *Panto No. 01*.

- **3D-Hero:** prozedural gebautes Three.js-Modell der Panto-Brille (Schildpatt-Acetat, Schlüsselloch-Steg, silberne Zierniete), das sich beim Scrollen langsam dreht.
- **Smooth Scrolling:** Lenis + GSAP ScrollTrigger (Wort-für-Wort-Text, Foto-Reveal, horizontaler Prozess-Abschnitt, hochzählende Kennzahlen).
- **Konfigurator:** zweite 3D-Szene zum Ziehen, vier Acetat-Farben, Glasoptionen mit Preis.
- **Kollektion:** Produktbilder werden beim Laden direkt aus dem 3D-Modell gerendert.
- **Warenkorb:** Seitenleiste mit Mengen, Zwischensumme und `localStorage`.

## Lokal starten

Die Seite ist rein statisch. Wegen der ES-Module braucht sie einen lokalen Server:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Struktur

```
index.html          Markup aller Abschnitte
css/style.css       Design-Tokens (Forest Green, Beige, Neon-Orange) und Layout
js/glasses.js       3D-Modell, Acetat-Texturen, Licht und Bühne
js/main.js          Scroll-Choreografie, Konfigurator, Kollektion, Warenkorb
assets/             Logo (freigestellt) und Produktfoto
```

Bibliotheken kommen per CDN: three.js 0.160.0, GSAP 3.12.5 mit ScrollTrigger, Lenis 1.1.13.
