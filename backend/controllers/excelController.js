// backend/controllers/excelController.js
import path from 'node:path';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// 1. Multer Configuration (File Storage)
// We use memory storage because we only need the file temporarily to read its content.
const storage = multer.memoryStorage();

// File filter to ensure only Excel files are uploaded
const fileFilter = (req, file, cb) => {
    // Check file extension or MIME type
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only Excel (.xls or .xlsx) files are allowed.'), false);
    }
};

// Multer middleware
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

// 2. Data Parsing Logic
const parseExcel = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        const file = req.file;
        // Convert Buffer data to a Workbook
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        
        // Get the name of the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert the sheet data to a JSON array
        // header: 1 means the first row is used as the column headers
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract column headers (the first row of the data array)
        const headers = data[0];
        
        // Extract the actual row data (from the second row onwards)
        const rows = data.slice(1);

        // Map the rows into an array of objects for easier use
        const dataObjects = rows.map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                // Use header as key, and the corresponding value from the row
                obj[header] = row[index];
            });
            return obj;
        });

        res.status(200).json({
            message: 'File successfully parsed.',
            sheetName: sheetName,
            headers: headers, // [ 'Cups of coffee consumed', 'Time of the day', ... ]
            data: dataObjects, // [{ 'Cups of coffee consumed': 3, 'Time of the day': 'Evening' }, ...]
        });

    } catch (error) {
        console.error("Error processing Excel file:", error);
        res.status(500).json({ message: 'Failed to process Excel file.', error: error.message });
    }
};


// --- CORE AI PROMPT ---
const basePrompt = (headers, data) => `
    You are an expert data analyst. The user has uploaded an Excel file and wants a clear, insightful summary of the data.
    
    1. Identify the key insights, trends, and potential anomalies.
    2. Provide a 3-point bulleted summary.
    3. State the total number of records.
    4. Keep the response professional and concise.
    5. Make sure to use proper new lines and formatting for readability.

    The data is provided below in JSON format:
    Headers: ${headers.join(', ')}
    Data: ${JSON.stringify(data.slice(0, 30))} 
    (Note: Only the first 30 rows are sent to save on token usage)
`;
// ----------------------

const getAiSummary = async (req, res) => {
    // --- UPDATED DESTRUCTURING: Capture the apiKey from the request body ---
    const { headers, data, model = process.env.DEFAULT_AI_MODEL || 'gemini', apiKey } = req.body;
    // ------------------------------------------------------------------------

    if (!headers || !data || data.length === 0) {
        return res.status(400).json({ message: "No data provided for analysis." });
    }
    
    // NEW: Check if API key is provided
    if (!apiKey) {
        return res.status(400).json({ message: `API key for ${model} is missing.` });
    }

    // --- INITIALIZE CLIENTS USING THE PROVIDED API KEY ---
    // If the apiKey is provided, it OVERRIDES the .env variable.
    const gemini = new GoogleGenAI({ apiKey: apiKey });
    const openai = new OpenAI({
        apiKey: apiKey,
    });
    // ----------------------------------------------
    
    const prompt = basePrompt(headers, data);
    let summaryText = '';

    try {
        if (model === 'gemini') {
            // Gemini API Call
            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [prompt],
            });
            summaryText = response.text;
        } else if (model === 'openai') {
            // ... (OpenAI GPT API Call using 'openai')
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            });
            summaryText = response.choices[0].message.content;
        } else {
            return res.status(400).json({ message: 'Invalid AI model selected.' });
        }

        res.status(200).json({
            summary: summaryText,
            model: model,
            message: `AI summary generated successfully by ${model}.`,
        });

    } catch (error) {
        console.error(`Error calling ${model} API:`, error.message);
        // Provide better error handling to the user if the key fails
        res.status(403).json({
            message: `AI API call failed (Status 403). The provided API key might be invalid, or you may have exceeded your quota.`,
            error: error.message
        });
    }
};

export { upload, parseExcel, getAiSummary }; 