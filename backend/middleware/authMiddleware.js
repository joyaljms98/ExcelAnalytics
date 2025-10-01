// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler'; // A utility to handle exceptions in async express routes
import User from '../models/User.js';

// Install express-async-handler
// In backend terminal: npm install express-async-handler

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check if the Authorization header exists and starts with 'Bearer'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header (it looks like: 'Bearer <TOKEN>')
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by ID from the token payload and attach to the request object (excluding password)
            req.user = await User.findById(decoded.id).select('-password');

            next(); // Move to the next middleware or route handler

        } catch (error) {
            console.error(error);
            // FIX: Set status to 401 (Unauthorized)
            res.status(401); 
            // FIX: Use JSON response for better client handling
            throw new Error('Not authorized, token failed'); // express-async-handler converts this to a 500 error, so using a standard Express response is cleaner here:
            res.json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

export { protect };