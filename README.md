# Luxlens

Produktseite für die Brillenmarke **Luxlens** mit der Fassung *Panto No. 01*.

- **3D-Hero:** prozedural gebautes Three.js-Modell der Panto-Brille (Schildpatt-Acetat, Schlüsselloch-Steg, silberne Zierniete), das sich beim Scrollen langsam dreht.
- **Smooth Scrolling:** Lenis + GSAP ScrollTrigger (Wort-für-Wort-Text, Foto-Reveal, horizontaler Prozess-Abschnitt, hochzählende Kennzahlen).
- **Konfigurator (`konfigurator.html`):** eigene Seite mit sechs Schritten (Farbe, Größe, Gläser, Sehstärke, Gravur, Übersicht), jeder Schritt mit eigener Adresse (`#farbe`, `#groesse` …), live 3D-Vorschau und Preis.
- **Kasse (`kasse.html`):** Kontakt, Lieferadresse mit Prüfung, Versand- und Zahlungsart, Bestellübersicht mit MwSt. und Bestätigungsseite. Demo ohne echte Zahlung.
- **Kollektion:** Produktbilder werden beim Laden direkt aus dem 3D-Modell gerendert.
- **Warenkorb:** Seitenleiste mit Produktfoto je Farbe, Mengen und Zwischensumme, auf allen Seiten geteilt über `localStorage`.

## Lokal starten

Die Seite ist rein statisch. `index.html` lässt sich direkt per Doppelklick öffnen (Internetverbindung für three.js, GSAP und Lenis nötig). Alternativ mit lokalem Server:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Struktur

```
index.html          Startseite
konfigurator.html   Konfigurator in sechs Schritten
kasse.html          Kasse und Bestellbestätigung
css/style.css       Design-Tokens (Forest Green, Beige, Neon-Orange) und Layout
css/pages.css       Layout für Konfigurator und Kasse
js/glasses.js       3D-Modell, Acetat-Texturen, Licht und Bühne
js/shop.js          Produktdaten, Warenkorb, Navigation (von allen Seiten genutzt)
js/main.js          Startseite: Scroll-Choreografie, Kollektion
js/configurator.js  Konfigurator-Schritte und 3D-Vorschau
js/checkout.js      Kasse: Formularprüfung, Summen, Bestätigung
assets/             Logo, bearbeitetes Produktfoto, Warenkorb-Bilder je Farbe
```

Bibliotheken kommen per CDN: three.js 0.160.0, GSAP 3.12.5 mit ScrollTrigger, Lenis 1.1.13.
