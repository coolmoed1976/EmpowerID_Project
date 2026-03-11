const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
const port = 3000;

// Middleware for static files
app.use(express.static('public'));

// SQL Server Configuration for Windows Authentication
const config = {
    // Try 'SQL Server' driver which was found on the system
    connectionString: 'Driver={SQL Server};Server=YOUR_SERVER_NAME;Database=YOUR_DATABASE_NAME;Trusted_Connection=yes;TrustServerCertificate=yes;',
};

// API Endpoint: Check DB Connection
app.get('/api/health', async (req, res) => {
    try {
        console.log('Prüfe Datenbank-Erreichbarkeit...');
        let pool = await sql.connect(config);
        await pool.request().query('SELECT 1');
        console.log('Datenbank ist erreichbar!');
        res.json({ status: 'connected', message: 'Datenbankverbindung erfolgreich hergestellt.' });
    } catch (err) {
        console.error('Verbindungsprüfung fehlgeschlagen:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        await sql.close();
    }
});

// API Endpoint to get Person with ID 10
app.get('/api/person', async (req, res) => {
    try {
        console.log('Rufe Person 10 ab...');
        await sql.connect(config);
        const result = await sql.query`SELECT Firstname, Lastname FROM Person WHERE PersonID = 10`;
        if (result.recordset && result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            console.log('Person mit ID 10 nicht gefunden.');
            res.status(404).send('Person with ID 10 nicht gefunden.');
        }
    } catch (err) {
        console.error('API Fehler:', err.message);
        res.status(500).send(`Serverfehler: ${err.message}`);
    } finally {
        await sql.close();
    }
});

app.listen(port, () => {
    console.log(`Server läuft unter http://localhost:${port}`);
    console.log('--- WICHTIG: Ersetze YOUR_SERVER_NAME und YOUR_DATABASE_NAME in server.js ---');
});
