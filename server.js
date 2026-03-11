const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
const port = 3000;

// Middleware for static files
app.use(express.static('public'));

// SQL Server Configuration for Windows Authentication
const config = {
    connectionString: 'Driver={SQL Server Native Client 11.0};Server=YOUR_SERVER_NAME;Database=YOUR_DATABASE_NAME;Trusted_Connection=yes;',
};

// API Endpoint to get Person with ID 10
app.get('/api/person', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT Firstname, Lastname FROM Person WHERE PersonID = 10`;
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).send('Person with ID 10 not found');
        }
    } catch (err) {
        console.error('SQL connection error:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server läuft unter http://localhost:${port}`);
    console.log('--- WICHTIG: Ersetze YOUR_SERVER_NAME und YOUR_DATABASE_NAME in server.js ---');
});
