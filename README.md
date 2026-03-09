# EmpowerID Custom Views & Layout Examples

Dieses Repository enthält nützliche Anleitungen und Praxis-Beispiele für die Erstellung von **Custom Views (Eigene Ansichten)** innerhalb des Identity Management Systems **EmpowerID**.

## 📖 Inhalt des Repositories

### 1. Anleitung / Dokumentation
* **`EmpowerID_Custom_Views_Anleitung.md`**
  Ein umfassendes Handbuch in deutscher Sprache, das die Architektur, Sicherheitskonzepte (GUIDs), SQL/Stored Procedures und die Knockout.js Frontend-Integration von EmpowerID detailliert erklärt.

### 2. Layout & UI Templates (Beispiele)
Die folgenden `.cshtml` Dateien können als Vorlagen für eigene Seiten im Verzeichnis `EmpowerID.Web.Overrides/Areas/UI/Views/CustomViews/Authenticated/` verwendet werden:

* **`Example1_BasicFormLayout.cshtml`**
  Zeigt das Grid-System von EmpowerID für einfache Formulare (`threecol`, `fourcol`) und Standard-Eingabefelder.
* **`Example2_TabsAndGrid.cshtml`**
  Demonstriert die Nutzung von statischen Tabs, Knockout-basierten Datengrids (`eidGrid`) und dynamisch nachladenden AJAX-Tabs.
* **`Example3_DashboardWidgets.cshtml`**
  Ein klassisches Dashboard-Konzept mit KPI-Kacheln (Widgets) für einen schnellen Überblick über Metriken.
* **`Example4_AdvancedControls.cshtml`**
  Behandelt fortgeschrittene Eingabeelemente wie Autocomplete-Suchen (`eidAutocomplete`), Datepicker und dynamische Sichtbarkeitssteuerungen via Knockout.js.
* **`Example5_MasterDetail.cshtml`**
  Implementiert eine interaktive 2-Spalten-Ansicht: Auf der linken Seite befindet sich eine auswählbare Master-Liste, auf der rechten Seite öffnet sich dynamisch das zugehörige Detail-Panel.

## 🚀 Nutzung

1. Kopieren Sie das gewünschte HTML/Razor-Gerüst aus den Beispielen.
2. Erstellen Sie eine neue Protected Application Resource in EmpowerID und fügen Sie deren **GUID** in die Sicherheitsprüfung der `.cshtml`-Datei ein:
   ```csharp
   EidAuthenticationHandler.HasAccessToPage(new Guid("IHR-GUID-HIER"))
   ```
3. Passen Sie die `EidDataSource` URLs und Component-Namen an Ihre spezifischen Stored Procedures an.

---
*Erstellt zur Unterstützung der EmpowerID Entwicklung.*
