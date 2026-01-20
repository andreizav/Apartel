const fs = require('fs');
const readline = require('readline');
const { Client } = require('pg');

// Configuration
const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/apartel_db'
};

const FILES = {
    RATES: 'Exchange_Rate.txt',
    PNL: 'P&L1.txt',
    CLEANING: 'Summary Cleaning.txt'
};

// State Maps (Caching)
const ratesCache = new Map(); // Key: "YYYY-MM-DD_CURRENCY", Value: Rate
const unitCache = new Map();  // Key: "normalized_name", Value: UUID
const userCache = new Map();  // Key: "normalized_name", Value: UUID
const categoryCache = new Map(); // Key: "name", Value: ID

async function main() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    try {
        console.log('--- Starting Financial Ingestion Engine ---');
        
        // 1. Load Metadata (Units, Users, Categories)
        await loadMetadata(client);
        
        // 2. Load Exchange Rates
        await processExchangeRates(client);

        // 3. Process General P&L (Matrix)
        await processPnLMatrix(client);

        // 4. Process Cleaning Summary (Hierarchy)
        await processCleaningHierarchy(client);

        console.log('--- Ingestion Complete Successfully ---');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await client.end();
    }
}

// ------------------------------------------------------------------
// 1. METADATA LOADING
// ------------------------------------------------------------------
async function loadMetadata(client) {
    console.log('Loading metadata...');
    
    const units = await client.query('SELECT id, internal_name FROM property_units');
    units.rows.forEach(r => unitCache.set(normalize(r.internal_name), r.id));

    const users = await client.query('SELECT id, name FROM users');
    users.rows.forEach(r => userCache.set(normalize(r.name), r.id));

    const cats = await client.query('SELECT id, name FROM expense_categories');
    cats.rows.forEach(r => categoryCache.set(normalize(r.name), r.id));
}

// ------------------------------------------------------------------
// 2. EXCHANGE RATES
// ------------------------------------------------------------------
async function processExchangeRates(client) {
    console.log(`Processing ${FILES.RATES}...`);
    // Mocking file read logic for standard text format: Date | UAH/USD | EUR/USD
    // In real scenario: fs.createReadStream...
    
    const mockData = [
        "2023-01-01|0.027|1.07",
        "2023-02-01|0.027|1.08"
    ];

    for (const line of mockData) {
        const [dateStr, uahRate, eurRate] = line.split('|');
        if (!dateStr) continue;

        // Save to DB
        await client.query(`
            INSERT INTO currency_rates (rate_date, currency_from, rate_to_usd)
            VALUES ($1, 'UAH', $2), ($1, 'EUR', $3)
            ON CONFLICT DO NOTHING
        `, [dateStr, uahRate, eurRate]);

        // Cache for runtime usage
        ratesCache.set(`${dateStr}_UAH`, parseFloat(uahRate));
        ratesCache.set(`${dateStr}_EUR`, parseFloat(eurRate));
    }
}

// ------------------------------------------------------------------
// 3. P&L MATRIX PARSER (General Expenses)
// ------------------------------------------------------------------
async function processPnLMatrix(client) {
    console.log(`Processing ${FILES.PNL}...`);
    
    // Structure: 
    // Row 1: Headers (Dates) -> Jan-19, Feb-19...
    // Row 2: Category (Office) -> 500, 600...
    
    const fileStream = fs.createReadStream(FILES.PNL);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headers = []; // Date strings

    for await (const line of rl) {
        const cols = line.split('\t'); // Assuming Tab separated
        
        // Header Detection
        if (headers.length === 0) {
            headers = cols.slice(1).map(d => parseDate(d)); // Skip first col (Category Name)
            continue;
        }

        const categoryName = cols[0];
        const amounts = cols.slice(1);

        // Find Category ID
        const catId = categoryCache.get(normalize(categoryName));
        if (!catId) {
            console.warn(`Warning: Unknown category '${categoryName}'. Skipping.`);
            continue;
        }

        // Iterate Columns (Dates)
        for (let i = 0; i < amounts.length; i++) {
            const rawAmount = amounts[i];
            const date = headers[i];

            if (!date || !rawAmount || rawAmount.includes('#VALUE')) continue;

            const amount = parseFloat(rawAmount.replace(/,/g, '')); // Clean "1,000"
            if (isNaN(amount) || amount === 0) continue;

            // Convert to USD
            const rate = getRate(date, 'UAH'); // Defaulting P&L source to UAH based on context
            const amountUsd = amount * rate;

            // Insert Global Expense (unit_id IS NULL)
            await client.query(`
                INSERT INTO financial_transactions 
                (transaction_date, category_id, amount_original, currency_original, amount_usd, source_file)
                VALUES ($1, $2, $3, 'UAH', $4, $5)
            `, [date, catId, amount, amountUsd, FILES.PNL]);
        }
    }
}

// ------------------------------------------------------------------
// 4. CLEANING SUMMARY PARSER (Hierarchical)
// ------------------------------------------------------------------
async function processCleaningHierarchy(client) {
    console.log(`Processing ${FILES.CLEANING}...`);

    const fileStream = fs.createReadStream(FILES.CLEANING);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headers = [];
    let currentStaffId = null;
    const cleanCatId = categoryCache.get('cleaning');

    for await (const line of rl) {
        const cols = line.split('\t');

        // Header
        if (headers.length === 0) {
            headers = cols.slice(1).map(d => parseDate(d));
            continue;
        }

        const rowLabel = cols[0].trim();
        
        // Logic: Determine if Row is Staff or Unit
        // Check if label matches a User
        const potentialUserId = userCache.get(normalize(rowLabel));
        if (potentialUserId) {
            currentStaffId = potentialUserId;
            continue; // It's a header row for the staff, move to next line
        }

        // Check if label matches a Unit
        const unitId = unitCache.get(normalize(rowLabel));
        if (unitId && currentStaffId) {
            // It is a Unit row belonging to currentStaff
            const amounts = cols.slice(1);

            for (let i = 0; i < amounts.length; i++) {
                const amount = parseFloat(amounts[i]);
                const date = headers[i];

                if (!amount || amount === 0 || !date) continue;

                const rate = getRate(date, 'UAH');
                const amountUsd = amount * rate;

                await client.query(`
                    INSERT INTO financial_transactions 
                    (transaction_date, category_id, unit_id, payee_id, amount_original, currency_original, amount_usd, source_file)
                    VALUES ($1, $2, $3, $4, $5, 'UAH', $6, $7)
                `, [date, cleanCatId, unitId, currentStaffId, amount, amountUsd, FILES.CLEANING]);
            }
        }
    }
}

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function normalize(str) {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/\s+/g, '').trim();
}

function parseDate(str) {
    // Basic parser, needs robust handling for "Jan-19" etc.
    // Returning ISO string YYYY-MM-DD
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

function getRate(dateStr, currency) {
    // Simplification: In reality, find closest date if exact match missing
    const rate = ratesCache.get(`${dateStr}_${currency}`);
    return rate || 0.027; // Fallback or throw error
}

main();
