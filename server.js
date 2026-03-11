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

// API Endpoint to get Person with ID 10
app.get('/api/person', async (req, res) => {
    try {
        console.log('Versuche Verbindung zur Datenbank...');
        await sql.connect(config);
        console.log('Verbindung erfolgreich!');
        const result = await sql.query`SELECT Firstname, Lastname FROM Person WHERE PersonID = 10`;
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            console.log('Person mit ID 10 nicht gefunden.');
            res.status(404).send('Person with ID 10 not found');
        }
    } catch (err) {
        console.error('SQL connection error details:', err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).send(`Datenbankfehler: ${err.message}`);
    } finally {
        await sql.close();
    }
});

app.listen(port, () => {
    console.log(`Server läuft unter http://localhost:${port}`);
    console.log('--- WICHTIG: Ersetze YOUR_SERVER_NAME und YOUR_DATABASE_NAME in server.js ---');
});
