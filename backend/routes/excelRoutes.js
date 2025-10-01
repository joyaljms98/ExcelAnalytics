// backend/routes/excelRoutes.js
import express from 'express';
import { upload, parseExcel, getAiSummary } from '../controllers/excelController.js'; // <-- Update import
import { protect } from '../middleware/authMiddleware.js'; // <-- NEW IMPORT
import Analysis from '../models/Analysis.js';


const router = express.Router();

// The upload route should be protected too, as only logged-in users should use the platform
// @route   POST /api/excel/upload
router.post('/upload', 
    protect, // <-- PROTECT THIS ROUTE
    upload.single('excelFile'), 
    parseExcel
);

// @desc    Save analysis history
// @route   POST /api/excel/history
// @access  Private
router.post('/history', protect, async (req, res) => {
    const { fileName, x_axis, y_axis, chartType } = req.body;

    // Create the analysis record, linking it to the logged-in user (req.user)
    const analysis = new Analysis({
        user: req.user._id, 
        fileName,
        x_axis,
        y_axis,
        chartType,
    });

    const createdAnalysis = await analysis.save();
    res.status(201).json(createdAnalysis);
});

// @desc    Get user's analysis history
// @route   GET /api/excel/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    // Find all analyses belonging to the logged-in user, sorted by newest first
    const history = await Analysis.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(history);
});

// @desc    Get AI-powered summary/insight from the data
// @route   POST /api/excel/summary
// @access  Private
router.post('/summary', protect, getAiSummary);

export default router;