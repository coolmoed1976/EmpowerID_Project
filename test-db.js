const sql = require('mssql/msnodesqlv8');

const config = {
    // Wenn 'msnodesqlv8' als Driver geladen wird, nutzt er bevorzugt den ConnectionString.
    // 'SQL Server' ist der Name, den dein System für den Standard-ODBC-Treiber ausgibt.
    connectionString: 'Driver={SQL Server};Server=YOUR_SERVER_NAME;Database=YOUR_DATABASE_NAME;Trusted_Connection=Yes;TrustServerCertificate=Yes;'
};

async function test() {
    console.log('--- Test Script gestartet ---');
    console.log('Versuche Verbindung mit String:', config.connectionString);
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
