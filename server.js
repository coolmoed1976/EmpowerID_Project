const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
const port = 3000;

// Middleware for static files
app.use(express.static('public'));

// SQL Server Configuration for Windows Authentication
const config = {
    connectionString: 'Driver={SQL Server};Server=YOUR_SERVER_NAME;Database=YOUR_DATABASE_NAME;Trusted_Connection=yes;TrustServerCertificate=yes;',
    options: {
        connectTimeout: 5000 // 5 Sekunden Timeout
    }
};

// Einfacher Ping-Test ohne Datenbank
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', message: 'Webserver läuft!' });
});

// API Endpoint: Check DB Connection
app.get('/api/health', async (req, res) => {
    console.log('--- Health-Check angefordert ---');
    try {
        console.log('Schritt 1: Versuche sql.connect mit Config...');
        // Wir verwenden ein kurzes Timeout für den Verbindungsaufbau
        await sql.connect(config);
        console.log('Schritt 2: Verbindung aufgebaut. Sende Test-Abfrage...');
        const result = await sql.query('SELECT 1 as test');
        console.log('Schritt 3: Abfrage erfolgreich:', result.recordset);
        res.json({ status: 'connected', message: 'Verbindung steht!' });
    } catch (err) {
        console.error('!!! Fehler im Health-Check:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        console.log('Schritt 4: Schließe Verbindung (optional)...');
        try { await sql.close(); } catch(e) {}
    }
});

// API Endpoint to get Person with ID 10
app.get('/api/person', async (req, res) => {
    console.log('--- Daten-Abfrage angefordert (ID 10) ---');
    try {
        console.log('Verbinde...');
        await sql.connect(config);
        console.log('Frage Daten ab...');
        const result = await sql.query`SELECT Firstname, Lastname FROM Person WHERE PersonID = 10`;
        console.log('Daten erhalten:', result.recordset ? result.recordset.length : 0, 'Zeilen');
        
        if (result.recordset && result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).send('Person nicht gefunden.');
        }
    } catch (err) {
        console.error('!!! Fehler in /api/person:', err.message);
        res.status(500).send(`Fehler: ${err.message}`);
    } finally {
        try { await sql.close(); } catch(e) {}
    }
});

app.listen(port, () => {
    console.log(`Server läuft unter http://localhost:${port}`);
    console.log('--- WICHTIG: Ersetze YOUR_SERVER_NAME und YOUR_DATABASE_NAME in server.js ---');
});
