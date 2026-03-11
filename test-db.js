const sql = require('mssql/msnodesqlv8');

// Nutze die gleichen Einstellungen wie in server.js
// BITTE PASSEN SIE DIESE WERTE HIER KURZ AN UM DEN TEST ZU LAUFEN
const config = {
    server: 'YOUR_SERVER_NAME', 
    database: 'YOUR_DATABASE_NAME',
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true, 
        trustServerCertificate: true,
        connectTimeout: 5000
    }
};

async function test() {
    console.log('--- Test Script gestartet ---');
    console.log('Versuche Verbindung zu:', config.server);
    try {
        await sql.connect(config);
        console.log('ERFOLG: Verbindung hergestellt!');
        const result = await sql.query('SELECT 1 as test');
        console.log('ERFOLG: Abfrage Ergebnis:', result.recordset);
    } catch (err) {
        console.error('FEHLER DETEILS:');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        if (err.originalError) {
            console.error('Original Error:', err.originalError.message);
        }
    } finally {
        await sql.close();
        console.log('--- Test Script beendet ---');
    }
}

test();
