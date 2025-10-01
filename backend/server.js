// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose'; // <-- NEW IMPORT
import userRoutes from './routes/userRoutes.js';
import excelRoutes from './routes/excelRoutes.js'; // <-- NEW IMPORT

// Load environment variables from .env file
dotenv.config();

// Function to connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

// Call the connect function
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS for all requests from the frontend
app.use(cors({
    origin: 'http://localhost:5173'
}));
// Body parser for reading JSON data
app.use(express.json()); // Allows us to get data in req.body

// User routes
app.use('/api/users', userRoutes); 

// Excel routes endpoint
app.use('/api/excel', excelRoutes); // <-- NEW LINE

// User routes endpoint
app.use('/api/users', userRoutes); // <-- NEW LINE

// Simple root route
app.get('/', (req, res) => {
    res.send('Excel Analytics Platform Backend is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});