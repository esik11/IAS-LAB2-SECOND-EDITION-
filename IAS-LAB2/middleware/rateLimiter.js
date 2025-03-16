const rateLimit = require('express-rate-limit');
const User = require('../models/User');

// Login attempt limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    handler: async (req, res) => {
        const email = req.body.email;
        if (email) {
            // Lock the account after 5 failed attempts
            await User.lockAccount(email);
        }
        res.status(429).json({ 
            error: 'Too many login attempts, account has been locked for security. Please try again after 15 minutes' 
        });
    }
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later' }
});

module.exports = {
    loginLimiter,
    apiLimiter
}; 