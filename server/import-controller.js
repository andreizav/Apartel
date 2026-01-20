/**
 * BACKEND CONTROLLER REFERENCE
 * File: server/import-controller.js
 * Dependencies: npm install express multer xlsx pg
 */

const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { Pool } = require('pg');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper to normalize strings
const normalize = (str) => (str ? str.toString().trim() : '');

/**
 * PARSING LOGIC: Matrix Unpivoting (Generic)
 * Handles both P&L (Categories) and Cleaning (Staff/Units)
 * Works for Excel and CSV (via xlsx lib)
 */
function parseMatrix(worksheet) {
  // xlsx.utils.sheet_to_json handles CSVs correctly if workbook was read with appropriate type
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const results = [];
  
  if (!rows || rows.length === 0) return results;

  // Header Detection Logic
  // Look for a row that contains dates (simplified regex or simple check)
  let headerRowIndex = 0;
  // If first cell says "Sum of Amount" or similar, skip it (Pivot Table artifact)
  if (rows[0][0] && (rows[0][0].toString().includes('Sum') || rows[0][0].toString().includes('Amount'))) {
      headerRowIndex = 1;
  }
  
  // Safety check
  if (headerRowIndex >= rows.length) return results;

  const headers = rows[headerRowIndex]; 
  
  // Start from next row
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = normalize(row[0]);
    
    // Skip totals or empty labels
    if (!rowLabel || rowLabel.toLowerCase().includes('total')) continue;

    // Iterate Columns (Dates)
    for (let j = 1; j < row.length; j++) {
      const dateVal = headers[j]; 
      let rawAmount = row[j];

      // Clean Data
      let amount = 0;
      if (typeof rawAmount === 'number') {
        amount = rawAmount;
      } else if (typeof rawAmount === 'string') {
        if (rawAmount.includes('#VALUE') || rawAmount.includes('Error')) {
            amount = 0; 
        } else {
            const parsed = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
            amount = isNaN(parsed) ? 0 : parsed;
        }
      }

      if (dateVal && (amount !== 0)) {
          results.push({
              date: dateVal, // Need standard date normalization in real app
              label: rowLabel,
              amount: amount
          });
      }
    }
  }
  return results;
}

// API Endpoint
router.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    // xlsx.read works for CSV buffers too!
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let parsedData = [];
    const importType = req.body.type;

    if (importType === 'finance' || importType === 'cleaning') {
       parsedData = parseMatrix(worksheet);
    } else if (importType === 'hierarchy') {
       // ... existing hierarchy logic
       parsedData = []; 
    }

    res.json({ 
        success: true, 
        count: parsedData.length, 
        preview: parsedData.slice(0, 100)
    });

  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
