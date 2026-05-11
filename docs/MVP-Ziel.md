# MVP Ziel & Mission (Gutachtery24 / GT24)

## Mission
Wir bauen eine digitale, transparente und rechtssichere Fallabwicklung für Gutachter- und Anwaltspfade, die den Kundenstatus nachvollziehbar macht, Partner effizient steuert und den administrativen Aufwand für alle Beteiligten deutlich reduziert.

## Problem, das wir lösen
- Kunden erleben Status-Intransparenz, Rückfragen und Medienbrüche.
- Partner (Gutachter/Anwälte) verlieren Zeit durch unklare Zuständigkeiten, fehlende Unterlagen und manuelle Abstimmung.
- Admins müssen Zuweisungen „blind“ steuern und sind ohne strukturierte Tools auf Prisma Studio/DB angewiesen.

## Zielgruppe
- Geschädigte Kunden (ohne Login, Zugriff via Token)
- Gutachter (GUTACHTER-Rolle)
- Anwälte (ANWALT-Rolle)
- Admin/Backoffice (ADMIN-Rolle)

## MVP muss können (Minimum, um live zu gehen)
1. **Token-basierter Kunden-Tracker**
   - Registrierung + OTP-Verifikation
   - Status für Gutachter- und Anwaltspfad sichtbar
   - Letztes Update, Timeline und Events

2. **Intake & Kundendaten**
   - Unfall-Intake-Formular
   - Versicherungsdaten (OWN/OPPONENT)
   - Profil bearbeiten (Kundendaten)

3. **Partner-Dashboard**
   - Case-Detail mit Rollen-Restriktion
   - Gutachter: nur gutachterStatus
   - Anwalt: nur anwaltStatus

4. **Assignments**
   - Admin kann Assignments erstellen
   - Partner können Accept/Release
   - Active-Key Logik für eindeutige Zuständigkeit

5. **Dokumentenfluss**
   - Upload/Download im Dashboard
   - Upload/Download im Customer-Portal
   - Sichtbarkeiten: CUSTOMER, PARTNERS, CUSTOMER_AND_PARTNERS

6. **Benachrichtigung & Mail (MVP minimal)**
   - Assignment erstellt + akzeptiert
   - Admin/Partner Inbox

## Nicht-Ziele (für MVP)
- Vollautomatisierte Regulierungslogik
- Externe Versicherer-Integrationen
- Vollständige Workflow-Automation/CRM

## Erfolgskriterien (MVP)
- Kunde kann Status nachvollziehen + Dokumente hochladen
- Partner können Status pflegen und Dokumente sehen
- Admin kann Zuständigkeit steuern
- Kein „Edge-Case-Loop“ (OTP, Assignment, Reload)
- Kernflows laufen ohne Prisma Studio
