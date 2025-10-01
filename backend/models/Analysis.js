// backend/models/Analysis.js
import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
    // Link this analysis record to a specific user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // References the User model
    },
    fileName: {
        type: String,
        required: true,
    },
    x_axis: {
        type: String,
        required: true,
    },
    y_axis: {
        type: String,
        required: true,
    },
    chartType: {
        type: String,
        required: true,
    },
    // You could store a small subset of the data or just metadata
    // For now, we'll keep it simple with just the config.
}, {
    timestamps: true,
});

const Analysis = mongoose.model('Analysis', AnalysisSchema);

export default Analysis;