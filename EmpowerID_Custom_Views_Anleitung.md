# EmpowerID Custom Views - Komplettes Handbuch zur Erstellung eigener Ansichten

## 1. ARCHITEKTUR UND GRUNDKONZEPTE

### 1.1 Überblick über EmpowerID Komponenten

EmpowerID basiert auf einer **Microsoft SQL Server Datenbank** (Identity Warehouse), die alle Daten, Konfigurationen und Objekte speichert. Die Weboberfläche nutzt das **ASP.NET MVC Framework** mit **Razor-Syntax** (.cshtml Dateien) und **Knockout.js** für Datenbindung.

**Kernkonzepte:**

- **Components**: Die Abstraktionsschicht zwischen SQL-Tabellen und API
  - Beispiel: Die SQL-Tabelle "Person" wird als Component "PersonView" exponiert
  - Alle Spalten in SQL werden zu Properties im Component
  - Components können benutzerdefinierte Methoden und gespeicherte Prozeduren haben

- **Identity Warehouse**: Zentrale SQL-Datenbank mit:
  - Tabellen (Account, Person, Role, Group, etc.)
  - Views (z.B. PersonView, AccountView)
  - Gespeicherte Prozeduren für spezifische Abfragen
  - Audit- und Queue-Tabellen

- **Protected Application Resources**: Alle Seiten sind geschützt durch:
  - Eindeutige GUID für jede Seite
  - RBAC (Role-Based Access Control) mit Operations und Access Levels
  - HasAccessToPage() und HasAccessToOperation() Checks

- **ViewOne/EditOne/MultiOperations Pages**: Standard-Seiten für Anzeige/Bearbeitung
  - ViewOne = Ansicht-Seite (Read-Only)
  - EditOne = Bearbeitungs-Seite
  - MultiOperations = Batch-Operationen

---

## 2. SCHRITT-FÜR-SCHRITT: GRUNDSTRUKTUR EINER CUSTOM VIEW

### 2.1 Ordnerstruktur erstellen

EmpowerID verwendet das **Overrides-System**, um standard Seiten anzupassen, ohne die Original-Dateien zu ändern.

**Pfad:** `C:\Program Files\TheDotNetFactory\EmpowerID\Web Sites\`

Erstellen Sie folgende Ordnerstruktur:

```
EmpowerID.Web.Overrides/
├── Areas/
│   └── UI/
│       └── Views/
│           ├── ViewOne/
│           │   └── Details/  (für ViewOne-Seiten)
│           ├── EditOne/
│           │   └── Details/  (für EditOne-Seiten)
│           └── CustomViews/
│               └── Authenticated/  (für eigene Custom Pages)
```

**Wichtig:** Die korrekte Ordnerstruktur ist essentiell. EmpowerID erkennt die Dateien nur, wenn sie im korrekten Pfad liegen!

### 2.2 Basis-CSHTML Dateistruktur

Erstellen Sie eine neue Datei: `MyCustomViewOne.cshtml`

**Grundgerüst:**

```html
@{
    // Razor-Blöcke für C#-Code
    ViewBag.Title = "My Custom View";
}

@* Dies ist ein Kommentar in Razor *@

<div class="eid-container">
    <h1>@ViewBag.Title</h1>
    
    @* Hier kommen UI-Elemente hin *@
</div>
```

---

## 3. SICHERHEIT UND ZUGRIFFSKONTROLLE

### 3.1 HasAccessToPage() Check

Jede Custom View muss mit einem Security-Check beginnen. Diese GUID finden Sie in der `ProtectedApplicationResource` Tabelle:

```html
@if (!EidContext.IsAnonymous && 
     EidAuthenticationHandler.HasAccessToPage(new Guid("1998dc9b-d8df-421b-a9ce-31f029cf0893")))
{
    <div class="eid-content">
        <!-- Seitencontent -->
    </div>
}
else
{
    <p>Sie haben keinen Zugriff auf diese Seite.</p>
}
```

**SQL-Query zum Finden der GUID:**

```sql
SELECT * FROM ProtectedApplicationResource 
WHERE ResourceName LIKE '%PersonDetails%'
```

### 3.2 Operation-basierte Sichtbarkeit

Um spezifische UI-Elemente basierend auf Benutzer-Berechtigungen zu verstecken:

```html
@if (Model.HasAccessToOperation("ViewAdvancedPersonAttributes"))
{
    <div class="advanced-attributes">
        <!-- Nur sichtbar für Benutzer mit dieser Operation -->
        <p>Geheime Informationen</p>
    </div>
}
```

### 3.3 GUID für neue Custom Pages

Für neue Custom Pages müssen Sie eine Protected Application Resource erstellen:

1. Navigieren Sie zu **Admin > Applications and Directories > Protected Application Resources**
2. Erstellen Sie einen neuen Eintrag
3. Speichern Sie die generierte GUID
4. Diese GUID verwenden Sie später in Ihrer CSHTML

---

## 4. SQL UND STORED PROCEDURES

### 4.1 Naming Convention für Stored Procedures

EmpowerID empfiehlt folgende Konvention:

```
CompanyAcronym_ComponentName_Purpose

Beispiele:
- DEMO_Account_GetExpiringAccounts
- DEMO_Person_GetManagerHierarchy
- ACME_ApplicationRole_GetByOwner
```

### 4.2 Erstellen einer Custom Stored Procedure

Öffnen Sie **SQL Server Management Studio (SSMS)** und verbinden Sie sich mit der EmpowerID-Datenbank.

**Schritt 1: Neue Stored Procedure erstellen**

```sql
USE [YourEmpowerIDDatabase]
GO

CREATE PROCEDURE [dbo].[DEMO_Account_GetExpiringAccounts]
    @ExpirationInDays INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT * 
    FROM Account (NOLOCK)
    WHERE ExpiresON > GETUTCDATE() 
      AND ExpiresON IS NOT NULL 
      AND ExpiresOn < DATEADD(Day, @ExpirationInDays, GETUTCDATE())
END
GO
```

**Wichtige Punkte:**

- **SELECT * ** ist erforderlich! Alle Component-Eigenschaften müssen zurückgegeben werden
- **(NOLOCK)** verhindert Locks bei gleichzeitigen Änderungen
- **GETUTCDATE()** für UTC-Zeit verwenden
- Parameter mit **@** Präfix deklarieren
- Benutzerdefinierte Prozeduren sollten **DEMO_** oder Ihr Akronym verwenden

### 4.3 Komplexere Stored Procedure mit JOINs

```sql
CREATE PROCEDURE [dbo].[DEMO_Person_GetManagerHierarchy]
    @PersonID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- CTE für rekursive Hierarchie
    WITH ManagerHierarchy AS (
        SELECT 
            p.PersonID,
            p.FirstName,
            p.LastName,
            p.Email,
            m.PersonID AS ManagerPersonID,
            m.FirstName AS ManagerFirstName,
            m.LastName AS ManagerLastName,
            1 AS Level
        FROM Person p (NOLOCK)
        LEFT JOIN PersonBusinessRoleLocation pbrl (NOLOCK) 
            ON p.PersonID = pbrl.PersonID
        LEFT JOIN Person m (NOLOCK) 
            ON pbrl.ManagerPersonID = m.PersonID
        WHERE p.PersonID = @PersonID
        
        UNION ALL
        
        SELECT 
            mh.PersonID,
            mh.FirstName,
            mh.LastName,
            mh.Email,
            m.PersonID,
            m.FirstName,
            m.LastName,
            mh.Level + 1
        FROM ManagerHierarchy mh
        LEFT JOIN PersonBusinessRoleLocation pbrl (NOLOCK)
            ON mh.ManagerPersonID = pbrl.PersonID
        LEFT JOIN Person m (NOLOCK)
            ON pbrl.ManagerPersonID = m.PersonID
        WHERE mh.Level < 5 -- Maximale Tiefe
    )
    SELECT * FROM ManagerHierarchy
END
GO
```

### 4.4 Views erstellen (Alternative zu Stored Procedures)

Views eignen sich für einfache, häufig benötigte Abfragen:

```sql
CREATE VIEW [dbo].[DEMO_PersonActiveAccounts] AS
SELECT 
    p.PersonID,
    p.FirstName,
    p.LastName,
    a.AccountID,
    a.Name AS AccountName,
    a.LogonName,
    ast.AccountStoreName
FROM Person p (NOLOCK)
INNER JOIN Account a (NOLOCK) ON p.PersonID = a.PersonID
INNER JOIN AccountStore ast (NOLOCK) ON a.AccountStoreID = ast.AccountStoreID
WHERE a.Disabled = 0
GO
```

### 4.5 Wichtige Standard-Tabellen

| Tabelle | Zweck | Beispiel-Spalten |
|---------|-------|------------------|
| Person | EmpowerID Identitäten | PersonID, FirstName, LastName, Email, PersonGUID |
| Account | Externe Benutzerkonten | AccountID, PersonID, LogonName, AccountStoreName |
| AccountStore | Quellsysteme (AD, Azure, etc.) | AccountStoreID, AccountStoreName, Type |
| Group | Gruppen/Rollen | GroupID, GroupName, GroupGUID |
| GroupMembership | Zugehörigkeiten | GroupMembershipID, GroupID, PersonID |
| PersonBusinessRoleLocation | Geschäftsrollen mit Managern | PersonID, BusinessRoleID, LocationID, ManagerPersonID |
| ApplicationRole | EmpowerID Application Roles | ApplicationRoleID, ApplicationRoleName, Owner, Approver |
| AuditLogOperation | Audit-Trail | AuditLogOperationID, PersonID, Operation, DateTime |

---

## 5. CSHTML UND RAZOR-SYNTAX DETAILLIERT

### 5.1 Razor-Syntax Grundlagen

```html
@* Einfache Expressions *@
<p>Hallo @Model.FirstName @Model.LastName</p>

@* Code Blocks *@
@{
    string fullName = Model.FirstName + " " + Model.LastName;
    int age = DateTime.Now.Year - Model.BirthYear;
}

@* Conditionals *@
@if (Model.Age > 18)
{
    <p>Erwachsener</p>
}
else
{
    <p>Minderjährig</p>
}

@* Schleifen *@
@foreach (var account in Model.Accounts)
{
    <tr>
        <td>@account.LogonName</td>
        <td>@account.AccountStoreName</td>
    </tr>
}

@* Ressourcen-Lokalisierung *@
<label>@Html.EidResx("LoginName")</label>
@* oder mit Escape *@
<label>@EidResx("LoginName", EscapeMode.HtmlAttribute)</label>
```

### 5.2 Model und ViewBag

```html
@{
    // Stark typisiertes Modell (bevorzugt)
    // @model MyNamespace.Models.PersonViewModel
    
    // ViewBag für lose typisierte Daten
    ViewBag.PageTitle = "Person Details";
    ViewBag.PersonName = "Max Mustermann";
}

<!-- Zugriff auf Model-Eigenschaften -->
<h1>@Model.Person.FirstName @Model.Person.LastName</h1>

<!-- Zugriff auf ViewBag -->
<h2>@ViewBag.PageTitle</h2>
```

### 5.3 HTML Helper

```html
@* EmpowerID spezifische Helper *@

@* Ressourcen-String *@
@Html.EidResx("LoginName")

@* Renderpartial *@
@Html.RenderPartial("PartialViewName", Model)

@* Action Links *@
@Html.ActionLink("Edit", "Edit", "Person", new { id = Model.PersonID }, null)

@* HTML Attributes *@
@Html.TextBox("Login", Model.Login, new { @class = "form-control", maxlength = 50 })

@* Forms *@
@using (@Html.BeginForm("Save", "Person", FormMethod.Post))
{
    @Html.AntiForgeryToken()
    <!-- Form Content -->
}
```

### 5.4 Knockout.js Data-Binding

EmpowerID nutzt **Knockout.js** für MVVM-ähnliche Client-seitige Bindungen:

```html
<div data-bind="if: isVisible">
    <p>Nur sichtbar wenn isVisible = true</p>
</div>

<input type="text" data-bind="value: firstName" />
<p>Hallo <span data-bind="text: firstName"></span></p>

<select data-bind="options: accountStores, 
                   optionsText: 'AccountStoreName',
                   value: selectedAccountStore">
</select>

<button data-bind="click: savePersone, disabled: isSaving">Speichern</button>

<table data-bind="foreach: accountList">
    <tr>
        <td data-bind="text: LogonName"></td>
        <td data-bind="text: AccountStoreName"></td>
    </tr>
</table>

@* Computed Observable *@
<p data-bind="text: fullName"></p>
@* JavaScript: this.fullName = ko.computed(function() { 
    return this.firstName() + ' ' + this.lastName(); }, this); *@
```

---

## 6. DATEN AUS SQL IN CSHTML LADEN

### 6.1 Component-basierter Ansatz (bevorzugt)

EmpowerID exponiert Stored Procedures als **Component-Methoden**. Diese sind die primäre Schnittstelle für Datenabruf.

**Schritt 1: Stored Procedure in EmpowerID registrieren**

1. Öffnen Sie **Workflow Studio**
2. Gehen Sie zu **Extensibility > EmpowerID Class Library**
3. Erstellen Sie eine neue Klassenbibliothek mit einer Methode, die Ihre Stored Procedure aufruft:

```csharp
using TheDotNetFactory.EmpowerID.Components;
using TheDotNetFactory.EmpowerID.Entities;

public class CustomProcedures
{
    public static E.VList<C.AccountView> GetExpiringAccounts(
        int expirationInDays, 
        int timeout = 30, 
        int start = 0,
        int pageLength = 0,
        out int totalCount)
    {
        totalCount = 0;
        
        // Aufruf der Stored Procedure
        return C.AccountView.ExecuteStoredProcedure(
            sprocName: "DEMO_Account_GetExpiringAccounts",
            timeout: timeout,
            start: start,
            pageLength: pageLength,
            totalCount: out totalCount,
            "@ExpirationInDays", 5  // Parameter
        );
    }
}
```

4. **Publish** (Compile and Publish Button)
5. **Services neustarten** wenn dazu aufgefordert

**Schritt 2: In CSHTML aufrufen**

```html
@{
    int totalCount = 0;
    var expiringAccounts = C.AccountView.ExecuteStoredProcedure(
        sprocName: "DEMO_Account_GetExpiringAccounts",
        timeout: 30,
        start: 0,
        pageLength: 0,
        totalCount: out totalCount,
        "@ExpirationInDays", 5
    );
}

<h2>Konten die in 5 Tagen ablaufen: @totalCount</h2>

<table class="eid-grid">
    <thead>
        <tr>
            <th>Login</th>
            <th>Kontoname</th>
            <th>Ablauf</th>
        </tr>
    </thead>
    <tbody>
        @foreach (var account in expiringAccounts)
        {
            <tr>
                <td>@account.LogonName</td>
                <td>@account.Name</td>
                <td>@account.ExpiresON?.ToString("dd.MM.yyyy")</td>
            </tr>
        }
    </tbody>
</table>
```

### 6.2 AJAX LoadPartial Ansatz für Grids

Für größere Datenmengen oder komplexe Layouts nutzt EmpowerID **AJAX LoadPartial**:

**In der Hauptseite:**

```html
<div data-bind="eidTab: { 
    Title: '@EidResx("MyGrid", true)',
    Url: '@Url.Action("LoadPartial", "ViewOne", 
        new { area = "Common", partial = "MyCustomGrid" })'
}"></div>
```

**Partielle View (MyCustomGrid.cshtml):**

```html
@{
    // Daten laden
    var data = //... SQL-Abfrage oder Component-Methode
}

<div data-bind="eidGrid: {
    DataSource: dataSource,
    DisplayColumns: ['LoginName', 'AccountStoreName'],
    PageLength: 25,
    SelectionMode: 'Multiple'
}">
    <!-- Grid wird automatisch durch eidGrid Binding gerendert -->
</div>

<script>
    var viewModel = {
        dataSource: new EidDataSource({
            type: 'GetData',
            url: '/Common/ViewOne/ComponentMethod?componentName=AccountView&methodName=GetByAccountID',
            data: function() { return { accountId: @Model.AccountID }; }
        })
    };
    ko.applyBindings(viewModel, document.getElementById('gridContainer'));
</script>
```

### 6.3 Direct AJAX Calls (für Custom Logic)

```html
<script>
    // Daten via AJAX laden
    $.ajax({
        url: '/api/v1/Account',
        method: 'GET',
        headers: {
            'X-EmpowerID-API-Key': 'YOUR_API_KEY'
        },
        data: {
            filter: 'LogonName eq "john.doe"'
        },
        success: function(data) {
            console.log('Accounts loaded:', data);
            // Knockout.js ViewModel updaten
            viewModel.accounts(data.value);
        },
        error: function(xhr) {
            console.error('Error loading accounts:', xhr.responseText);
        }
    });
</script>
```

---

## 7. GRIDS UND DATENVISUALISIERUNG

### 7.1 eidGrid Binding

Das EmpowerID-eigene Grid-Control mit Knockout.js:

```html
<div data-bind="eidGrid: {
    title: 'My Account Grid',
    DataSource: accountDataSource,
    DisplayColumns: [
        { DataFieldName: 'LogonName', Title: 'Login', Width: '200px' },
        { DataFieldName: 'AccountStoreName', Title: 'Source', Width: '150px' },
        { DataFieldName: 'Name', Title: 'Name', Width: '250px' },
        { DataFieldName: 'Disabled', Title: 'Deaktiviert', Width: '80px', FormatType: 'Boolean' }
    ],
    PageLength: 25,
    EnableSearch: true,
    SelectionMode: 'Multiple',
    AllowSort: true,
    AllowFilter: true
}"></div>
```

### 7.2 Grid mit HyperLink-Spalten

```html
@{
    Html.RenderPartial("HyperLinkColumn", new TheDotNetFactory.EmpowerID.Web.PortableAreas.Common.Models.Shared.HyperLinkColumnModel()
    { 
        Title = "Login",
        DataFieldName = "EmpowerIDLogon",
        AccessGuid = Guid.Parse("1998dc9b-d8df-421b-a9ce-31f029cf0893"),
        UrlFormat = Url.HashedContent("Common/ViewOne/Component?id={PersonID}&componentName=Person", removeArea: false)
    });
}
```

### 7.3 Custom Grid Column Template

```html
<div data-bind="eidGridColumn: { 
    Title: 'Aktionen', 
    DataFieldName: 'PersonID', 
    FormatType: 'Custom' 
}">
    <button data-bind="click: function() { 
        editPerson(ParentRow.DataItem.PersonID()) 
    }">
        Bearbeiten
    </button>
</div>
```

---

## 8. FORMULARE UND EINGABEELEMENTE

### 8.1 Textfelder mit Data-Binding

```html
<div class="eid-form-field threecol">
    <label>
        <span>@Html.EidResx("EmpowerIDLogin")</span>
        <input type="text" data-bind="value: login" />
    </label>
</div>

<div class="eid-form-field threecol">
    <label>
        <span>@Html.EidResx("EmailAddress")</span>
        <input type="email" data-bind="value: email, enable: canEdit" />
    </label>
</div>
```

### 8.2 Checkboxen

```html
<div class="eid-form-field fourcol">
    <label>
        <span>@Html.EidResx("Disabled")</span>
        <input type="checkbox" data-bind="eidCheckBox: { 
            checked: disabled, 
            enableTriState: true 
        }" />
    </label>
</div>
```

### 8.3 Autocomplete / Dropdown

```html
<div class="eid-form-field threecol">
    <label>
        <span>@Html.EidResx("Person")</span>
        <div data-bind="eidAutocomplete: {
            value: personID,
            componentName: 'PersonSearch',
            methodName: 'GetSearch',
            displayField: 'FriendlyName',
            otherFields: ['PersonID', 'FriendlyName', 'Login'],
            valueField: 'PersonGUID',
            ItemHref: 'Common/ViewOne/ComponentByGuid?id={1}&componentName={0}',
            ItemTemplateName: 'EidAutoCompletePerson'
        }"></div>
    </label>
</div>
```

### 8.4 Datum-Felder

```html
<div class="eid-form-field threecol">
    <label>
        <span>@Html.EidResx("StartDate")</span>
        <input type="date" data-bind="date: { 
            value: startDate, 
            viewModelFormat: 'toUTCZeroTimeString'
        }" />
    </label>
</div>
```

### 8.5 Form Templates

```html
@Html.StartTemplate("MyFormTemplate")
    <div class="eid-form-field fourcol">
        <label>
            <span>@Html.EidResx("LoginName")</span>
            <input type="text" data-bind="value: login" />
        </label>
    </div>
@Html.EndTemplate()

@* Verwendung *@
<div data-bind="template: { name: 'MyFormTemplate' }"></div>
```

---

## 9. TABS UND PARTIELLE VIEWS

### 9.1 Tab-Struktur mit LoadPartial

```html
@* Haupt-ViewOne Seite *@

<div class="eid-tabs">
    
    @* Tab 1: Basis-Informationen (inline) *@
    <div data-bind="eidTab: { Title: 'Allgemein' }">
        <div class="eid-form-field">
            <label>Name: <span data-bind="text: name"></span></label>
        </div>
    </div>
    
    @* Tab 2: Konten (via AJAX-Partial) *@
    <div data-bind="eidTab: { 
        Title: '@EidResx("Accounts")',
        Url: '@Url.Action("LoadPartial", "ViewOne", 
            new { area = "Common", partial = "AccountsGrid", id = Model.PersonID })'
    }"></div>
    
    @* Tab 3: Gruppen (via AJAX-Partial) *@
    <div data-bind="eidTab: { 
        Title: '@EidResx("Groups")',
        Url: '@Url.Action("LoadPartial", "ViewOne",
            new { area = "Common", partial = "GroupsGrid", id = Model.PersonID })'
    }"></div>
    
</div>
```

### 9.2 Partielle View für Accounts (AccountsGrid.cshtml)

```html
@model PersonViewModel

<h3>Zugewiesene Konten</h3>

@{
    var accounts = C.AccountView.GetAllSearch(
        columnsToSearch: "LogonName",
        textToSearch: "",
        resourceSystemTypeModuleID: null,
        parameters: null,
        displayField: "LogonName",
        personID: Model.PersonID,
        start: 0,
        pageLength: 0,
        totalCount: out int totalCount
    );
}

<div id="accountsGrid" data-bind="eidGrid: {
    DataSource: accountDataSource,
    DisplayColumns: [
        { DataFieldName: 'LogonName', Title: 'Login', Width: '200px' },
        { DataFieldName: 'AccountStoreName', Title: 'Quelle', Width: '200px' },
        { DataFieldName: 'Disabled', Title: 'Deaktiviert', Width: '100px', FormatType: 'Boolean' }
    ],
    PageLength: 20
}"></div>

<script>
    var accountsViewModel = {
        accountDataSource: new EidDataSource({
            type: 'GetData',
            url: '/Common/ViewOne/ComponentMethod',
            data: function() { 
                return {
                    componentName: 'AccountView',
                    methodName: 'GetByPersonID',
                    personID: @Model.PersonID
                };
            },
            pageLength: 20
        })
    };
    ko.applyBindings(accountsViewModel, document.getElementById('accountsGrid'));
</script>
```

---

## 10. SECURITY TRIMMING PRAKTISCH

### 10.1 Komplettes Beispiel mit Sichtbarkeitskontrollen

```html
@if (!EidContext.IsAnonymous && 
     EidAuthenticationHandler.HasAccessToPage(new Guid("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")))
{
    <div class="eid-container person-details">
        
        <h1>@Model.Person.FirstName @Model.Person.LastName</h1>
        
        @* Sektion nur für Benutzer mit ViewBasicPersonAttributes *@
        @if (Model.HasAccessToOperation("ViewBasicPersonAttributes"))
        {
            <section class="basic-info">
                <h2>Persönliche Informationen</h2>
                <div class="eid-form-field">
                    <label>Email: <span>@Model.Person.Email</span></label>
                </div>
                <div class="eid-form-field">
                    <label>Telefon: <span>@Model.Person.Phone</span></label>
                </div>
            </section>
        }
        
        @* Sektion nur für Benutzer mit ViewAdvancedPersonAttributes *@
        @if (Model.HasAccessToOperation("ViewAdvancedPersonAttributes"))
        {
            <section class="advanced-info">
                <h2>Erweiterte Attribute</h2>
                <div class="dropdown">
                    <button class="btn" data-toggle="dropdown">
                        Weitere Attribute anzeigen
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <label>Gehaltsstufe: <span>@Model.Person.SalaryLevel</span></label>
                        </li>
                        <li>
                            <label>Abteilung: <span>@Model.Person.Department</span></label>
                        </li>
                    </ul>
                </div>
            </section>
        }
        
        @* Buttons nur für Benutzer mit EditPerson Operation *@
        @if (Model.HasAccessToOperation("EditPerson"))
        {
            <div class="actions">
                <a href="@Url.Action("EditOne", new { id = Model.Person.PersonID })" 
                   class="btn btn-primary">
                    Bearbeiten
                </a>
            </div>
        }
        
        @* Tabs mit teilweisem Zugriff *@
        <div class="eid-tabs">
            @if (Model.HasAccessToOperation("ViewPersonAccounts"))
            {
                <div data-bind="eidTab: { 
                    Title: 'Konten',
                    Url: '@Url.Action("LoadPartial", "ViewOne", 
                        new { area = "Common", partial = "PersonAccountsGrid", 
                              id = Model.Person.PersonID })'
                }"></div>
            }
            
            @if (Model.HasAccessToOperation("ViewPersonRoles"))
            {
                <div data-bind="eidTab: {
                    Title: 'Rollen',
                    Url: '@Url.Action("LoadPartial", "ViewOne",
                        new { area = "Common", partial = "PersonRolesGrid",
                              id = Model.Person.PersonID })'
                }"></div>
            }
        </div>
        
    </div>
}
else
{
    <div class="alert alert-danger">
        <p>Sie haben keinen Zugriff auf diese Seite.</p>
    </div>
}
```

---

## 11. VOLLSTÄNDIGES PRAKTISCHES BEISPIEL: APPLICATION ROLES CUSTOM VIEW

### 11.1 SQL: ApplicationRole Daten abrufen

**Stored Procedure:** `DEMO_ApplicationRole_GetWithOwnerApprover.sql`

```sql
CREATE PROCEDURE [dbo].[DEMO_ApplicationRole_GetWithOwnerApprover]
    @ApplicationRoleID INT = NULL,
    @EnvironmentType NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ar.ApplicationRoleID,
        ar.ApplicationRoleName,
        ar.ApplicationRoleGUID,
        ar.Description,
        ar.Disabled,
        ar.CreatedDate,
        ar.ModifiedDate,
        
        -- Owner-Informationen
        pOwner.PersonID AS OwnerPersonID,
        pOwner.FirstName AS OwnerFirstName,
        pOwner.LastName AS OwnerLastName,
        pOwner.Email AS OwnerEmail,
        
        -- Approver-Informationen
        pApprover.PersonID AS ApproverPersonID,
        pApprover.FirstName AS ApproverFirstName,
        pApprover.LastName AS ApproverLastName,
        pApprover.Email AS ApproverEmail,
        
        -- Environement
        CASE 
            WHEN ar.ApplicationRoleID % 2 = 0 THEN 'PRD'
            ELSE 'NonPRD'
        END AS Environment,
        
        COUNT(arm.ApplicationRoleMemberID) AS MemberCount
        
    FROM ApplicationRole ar (NOLOCK)
    LEFT JOIN Person pOwner (NOLOCK) ON ar.OwnerID = pOwner.PersonID
    LEFT JOIN Person pApprover (NOLOCK) ON ar.ApproverID = pApprover.PersonID
    LEFT JOIN ApplicationRoleMembership arm (NOLOCK) ON ar.ApplicationRoleID = arm.ApplicationRoleID
    
    WHERE (ar.ApplicationRoleID = @ApplicationRoleID OR @ApplicationRoleID IS NULL)
      AND (
        CASE 
            WHEN ar.ApplicationRoleID % 2 = 0 THEN 'PRD'
            ELSE 'NonPRD'
        END = @EnvironmentType OR @EnvironmentType IS NULL
      )
    
    GROUP BY 
        ar.ApplicationRoleID,
        ar.ApplicationRoleName,
        ar.ApplicationRoleGUID,
        ar.Description,
        ar.Disabled,
        ar.CreatedDate,
        ar.ModifiedDate,
        pOwner.PersonID,
        pOwner.FirstName,
        pOwner.LastName,
        pOwner.Email,
        pApprover.PersonID,
        pApprover.FirstName,
        pApprover.LastName,
        pApprover.Email
        
    ORDER BY ar.ApplicationRoleName ASC
END
GO
```

### 11.2 ViewOne Page: ApplicationRoleDetails.cshtml

```html
@model dynamic

@{
    ViewBag.Title = "Application Role Details";
    
    // Daten abrufen
    int appRoleID = ViewBag.ApplicationRoleID ?? 0;
    int totalCount = 0;
    
    var appRoles = C.ApplicationRoleView.ExecuteStoredProcedure(
        sprocName: "DEMO_ApplicationRole_GetWithOwnerApprover",
        timeout: 30,
        start: 0,
        pageLength: 1,
        totalCount: out totalCount,
        "@ApplicationRoleID", appRoleID
    );
    
    var appRole = appRoles.FirstOrDefault();
}

@if (!EidContext.IsAnonymous && 
     EidAuthenticationHandler.HasAccessToPage(new Guid("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX")))
{
    <div class="eid-container application-role-view">
        
        <h1>@appRole?.ApplicationRoleName</h1>
        <p class="description">@appRole?.Description</p>
        
        @* Basiseigenschaften *@
        <section class="basic-info">
            <h2>Allgemeine Informationen</h2>
            <table class="details-table">
                <tr>
                    <td class="label">@EidResx("ApplicationRoleName")</td>
                    <td>@appRole?.ApplicationRoleName</td>
                </tr>
                <tr>
                    <td class="label">@EidResx("Status")</td>
                    <td>
                        @if (appRole?.Disabled == true)
                        {
                            <span class="badge badge-danger">Deaktiviert</span>
                        }
                        else
                        {
                            <span class="badge badge-success">Aktiv</span>
                        }
                    </td>
                </tr>
                <tr>
                    <td class="label">@EidResx("CreatedDate")</td>
                    <td>@appRole?.CreatedDate?.ToString("dd.MM.yyyy HH:mm")</td>
                </tr>
            </table>
        </section>
        
        @* Owner und Approver *@
        @if (Model.HasAccessToOperation("ViewApplicationRoleOwnerApprover"))
        {
            <section class="delegation-info">
                <h2>Berechtigungen</h2>
                
                <div class="row">
                    <div class="col-md-6">
                        <h3>Owner</h3>
                        @if (appRole?.OwnerPersonID.HasValue == true)
                        {
                            <div class="person-card">
                                <p>
                                    <strong>@appRole.OwnerFirstName @appRole.OwnerLastName</strong>
                                </p>
                                <p>@appRole.OwnerEmail</p>
                                <a href="@Url.Action("ViewOne", "Person", 
                                    new { id = appRole.OwnerPersonID })" 
                                   class="btn btn-sm btn-link">
                                    Zum Profil
                                </a>
                            </div>
                        }
                        else
                        {
                            <p class="text-muted">Kein Owner zugewiesen</p>
                        }
                    </div>
                    
                    <div class="col-md-6">
                        <h3>Approver</h3>
                        @if (appRole?.ApproverPersonID.HasValue == true)
                        {
                            <div class="person-card">
                                <p>
                                    <strong>@appRole.ApproverFirstName @appRole.ApproverLastName</strong>
                                </p>
                                <p>@appRole.ApproverEmail</p>
                                <a href="@Url.Action("ViewOne", "Person",
                                    new { id = appRole.ApproverPersonID })"
                                   class="btn btn-sm btn-link">
                                    Zum Profil
                                </a>
                            </div>
                        }
                        else
                        {
                            <p class="text-muted">Kein Approver zugewiesen</p>
                        }
                    </div>
                </div>
            </section>
        }
        
        @* Tabs für komplexere Daten *@
        <div class="eid-tabs">
            
            @* Mitglieder-Tab *@
            @if (Model.HasAccessToOperation("ViewApplicationRoleMembers"))
            {
                <div data-bind="eidTab: {
                    Title: '@EidResx("Members") (@(appRole?.MemberCount ?? 0))',
                    Url: '@Url.Action("LoadPartial", "ViewOne",
                        new { area = "Common", 
                              partial = "ApplicationRoleMembersGrid",
                              id = appRoleID })'
                }"></div>
            }
            
            @* Approvals-Tab *@
            @if (Model.HasAccessToOperation("ViewApplicationRoleApprovals"))
            {
                <div data-bind="eidTab: {
                    Title: '@EidResx("Approvals")',
                    Url: '@Url.Action("LoadPartial", "ViewOne",
                        new { area = "Common",
                              partial = "ApplicationRoleApprovalsGrid",
                              id = appRoleID })'
                }"></div>
            }
            
            @* Audit-Log-Tab *@
            <div data-bind="eidTab: {
                Title: '@EidResx("AuditLog")',
                Url: '@Url.Action("LoadPartial", "ViewOne",
                    new { area = "Common",
                          partial = "ApplicationRoleAuditGrid",
                          id = appRoleID })'
            }"></div>
            
        </div>
        
        @* Edit-Button (nur mit Berechtigung) *@
        @if (Model.HasAccessToOperation("EditApplicationRole"))
        {
            <div class="actions">
                <a href="@Url.Action("EditOne", "ApplicationRole", 
                    new { id = appRoleID })"
                   class="btn btn-primary">
                    Bearbeiten
                </a>
            </div>
        }
        
    </div>
}
else
{
    <div class="alert alert-danger">
        @EidResx("NoAccessToPage")
    </div>
}
```

### 11.3 Partielle View: ApplicationRoleMembersGrid.cshtml

```html
@model dynamic

@{
    int appRoleID = ViewBag.ApplicationRoleID ?? 0;
    int totalCount = 0;
}

<h3>@EidResx("Members")</h3>

@{
    // Daten laden
    var members = C.ApplicationRoleMembershipView.GetSearch(
        columnsToSearch: "PersonName",
        textToSearch: "",
        applicationRoleID: appRoleID,
        start: 0,
        pageLength: 0,
        totalCount: out totalCount
    );
}

<p class="info">Insgesamt @totalCount Mitglieder</p>

<div id="membersGrid" data-bind="eidGrid: {
    DataSource: membersDataSource,
    DisplayColumns: [
        { 
            DataFieldName: 'PersonName', 
            Title: '@EidResx("PersonName")', 
            Width: '300px',
            ItemHref: 'Common/ViewOne/Component?id={PersonID}&componentName=Person'
        },
        { 
            DataFieldName: 'Email', 
            Title: '@EidResx("Email")', 
            Width: '300px'
        },
        { 
            DataFieldName: 'AssignmentDate', 
            Title: '@EidResx("AssignmentDate")', 
            Width: '150px',
            FormatType: 'Date'
        },
        { 
            DataFieldName: 'Disabled', 
            Title: '@EidResx("Status")', 
            Width: '100px',
            FormatType: 'Boolean'
        }
    ],
    PageLength: 25,
    EnableSearch: true,
    AllowSort: true
}"></div>

<script>
    var membersViewModel = {
        membersDataSource: new EidDataSource({
            type: 'GetData',
            url: '@Url.Action("ComponentMethod", "ViewOne", new { area = "Common" })',
            data: function() {
                return {
                    componentName: 'ApplicationRoleMembershipView',
                    methodName: 'GetByApplicationRoleID',
                    applicationRoleID: @appRoleID
                };
            },
            pageLength: 25
        })
    };
    
    ko.applyBindings(membersViewModel, document.getElementById('membersGrid'));
</script>
```

---

## 12. HÄUFIGE FEHLER UND LÖSUNGEN

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| "The view 'MyCustomView' was not found" | Falsche Ordnerstruktur | Überprüfen Sie den kompletten Pfad inkl. Areas/UI/Views |
| Grid wird nicht angezeigt | ComponentName oder MethodName falsch | Prüfen Sie mit F12 Dev Tools, welche URL aufgerufen wird |
| "No access to page" Meldung | GUID nicht registriert als Protected App Resource | Registrieren Sie die GUID in Admin > Protected Application Resources |
| Stored Procedure gibt 0 Ergebnisse | Parameter nicht korrekt übergeben | Testen Sie die Procedure direkt in SSMS mit Test-Parametern |
| SELECT * fehler | Nicht alle Spalten des Components zurückgegeben | Stelle sicher, dass alle Spalten in der Stored Procedure retourniert werden |
| Knockout.js Bindings funktionieren nicht | Daten nicht im korrekten Format | Prüfen Sie die JSON-Struktur in der Browser-Konsole |
| Partielle View lädt nicht | Falscher Partial-Name oder -Path | Partial muss exakt im richtigen Order existieren |
| Lokalisierung funktioniert nicht | EidResx Resource-Schlüssel falsch | Überprüfen Sie den exakten Key in der Localized Text |

---

## 13. BEST PRACTICES UND TIPPS

### 13.1 Performance-Optimierung

```sql
-- NOLOCK immer verwenden um Locks zu vermeiden
SELECT * FROM Person (NOLOCK) WHERE PersonID = @PersonID

-- Indizes auf häufig gefilterten Spalten
CREATE INDEX IX_Person_Email ON Person(Email)

-- Pagination für große Datenmengen
SELECT * FROM Person (NOLOCK)
ORDER BY PersonID
OFFSET @Start ROWS
FETCH NEXT @PageLength ROWS ONLY
```

### 13.2 Debugging

```html
@* Browser Developer Tools (F12) nutzen *@
<script>
    console.log('ViewModel vor Binding:', viewModel);
    console.log('Knockout Observables:', ko.mapping.toJSON(viewModel));
    
    // Breakpoint setzen
    debugger;
</script>

@* Razor-Code Debugging *@
@{
    // In Visual Studio Breakpoint setzen
    System.Diagnostics.Debugger.Break();
    
    var data = C.PersonView.GetAll();
    System.Diagnostics.Debug.WriteLine("Loaded " + data.Count + " persons");
}
```

### 13.3 Code-Reusability

```html
@* Template für wiederverwendbare Komponenten *@

@* _PersonCard.cshtml *@
@model Person
<div class="person-card">
    <h3>@Model.FirstName @Model.LastName</h3>
    <p>@Model.Email</p>
    <a href="@Url.Action("ViewOne", new { id = Model.PersonID })">
        Details
    </a>
</div>

@* Verwendung in Hauptseite *@
@foreach (var person in Model.People)
{
    @Html.Partial("_PersonCard", person)
}
```

### 13.4 Sicherheit

```html
@* Immer HTML-Encoden *@
<p>@Html.Encode(Model.UserInput)</p>

@* Nicht verwenden - XSS-Gefahr! *@
<p>@Html.Raw(Model.UserInput)</p>

@* CSRF-Token in Forms *@
@using (@Html.BeginForm())
{
    @Html.AntiForgeryToken()
    <!-- Form Content -->
}
```

---

## 14. RESSOURCEN UND WEITERFÜHRENDES

### 14.1 Offizielle Dokumentation

- **EmpowerID Developer Guide**: https://docs.empowerid.com/
- **Object Model API**: https://dotnetworkflow.jira.com/
- **Web API Quick Start**: https://docs.empowerid.com/2016/dev/webapi/quickstart

### 14.2 Verwandte Technologien

- **Knockout.js Dokumentation**: https://knockoutjs.com/
- **Razor Syntax**: https://learn.microsoft.com/en-us/aspnet/mvc/views/razor
- **ASP.NET MVC**: https://learn.microsoft.com/en-us/aspnet/mvc/

### 14.3 Tools

- **SQL Server Management Studio (SSMS)** - Für SQL-Entwicklung
- **Visual Studio** - Für C#/Workflow Studio Entwicklung
- **Browser Developer Tools** (F12) - Für Frontend-Debugging
- **Fiddler** - Für HTTP-Debugging

---

## 15. CHECKLISTE FÜR NEUE CUSTOM VIEWS

- [ ] Ordnerstruktur erstellt
- [ ] Stored Procedure in SQL erstellt und getestet
- [ ] CSHTML-Datei mit korrekter Struktur erstellt
- [ ] Protected Application Resource GUID registriert
- [ ] HasAccessToPage() Check implementiert
- [ ] Daten-Binding (Knockout.js) konfiguriert
- [ ] Grid/Tabellen angezeigt
- [ ] Sicherheitskontrollen (HasAccessToOperation) eingebaut
- [ ] Lokalisierung (EidResx) eingefügt
- [ ] Im Test getestet mit verschiedenen Berechtigungsstufen
- [ ] Dokumentation aktualisiert
- [ ] Performance optimiert (Indizes, Paging)
- [ ] Fehlerbehandlung implementiert

---

**Version:** 1.0  
**Letztes Update:** 2026  
**Autor:** IT Development Team
