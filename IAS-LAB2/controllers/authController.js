const express = require('express');
const router = express.Router();
const { auth } = require('../config/firebase');
const { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendEmailVerification
} = require('firebase/auth');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { generateTokens } = require('../utils/jwt');
const { verifyToken } = require('../utils/jwt');
const { loginLimiter } = require('../middleware/rateLimiter');


// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// GET routes
router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

// Registration route
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Create user in Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(firebaseUser);
        
        // Store user in MySQL (without password)
        await User.createUser(email, name);
        
        res.json({
            success: true,
            message: 'Registration successful! Please check your email for verification.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add this function at the top with your other functions
async function generateAndSendOTP(user) {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    // Save OTP in database
    await User.saveOTP(user.id, otp, otpExpiry);
    
    // Send OTP email
    await sendOTPToPreferredEmail(user, otp);
    
    return otp;
}

// Add this new route for resending OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const userId = req.session.pendingUserId;
        if (!userId) {
            throw new Error('No pending login found. Please login again.');
        }

        // Get user data
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate and send new OTP
        await generateAndSendOTP(user);

        res.json({
            success: true,
            message: 'New OTP has been sent to your email.'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Function to send OTP email
async function sendOTPToPreferredEmail(user, otp, useBackup = false) {
    const emailToUse = useBackup ? user.backup_email : user.email;
    
    if (useBackup && (!user.backup_email || !user.backup_email_verified)) {
        throw new Error('No verified backup email available');
    }
    
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailToUse,
        subject: 'Login OTP',
        html: `
            <h1>Your Login OTP</h1>
            <p>Your OTP for login is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
            <p>This was sent to your ${useBackup ? 'backup' : 'primary'} email.</p>
        `
    });
}

// Login route
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if account is locked
        const isLocked = await User.isAccountLocked(email);
        if (isLocked) {
            throw new Error('Account is temporarily locked. Please try again later.');
        }
        
        // Verify with Firebase
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            
            // Record successful login attempt
            await User.recordLoginAttempt(email, true);
            
            // Check if email is verified
            if (!firebaseUser.emailVerified) {
                return res.status(400).json({ 
                    error: 'Please verify your email before logging in.',
                    needsVerification: true 
                });
            }
            
            // Get user from MySQL
            const user = await User.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Generate and send OTP
            await generateAndSendOTP(user);
            
            // Store user ID in session for OTP verification
            req.session.pendingUserId = user.id;
            
            res.json({
                success: true,
                message: 'OTP has been sent to your email.',
                requireOTP: true
            });
        } catch (error) {
            // Record failed login attempt
            await User.recordLoginAttempt(email, false);
            throw error;
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.session.pendingUserId;
        
        if (!userId) {
            throw new Error('Please login first');
        }
        
        // Verify OTP
        const isValid = await User.verifyOTP(userId, otp);
        if (!isValid) {
            throw new Error('Invalid or expired OTP');
        }
        
        // Get user data
        const user = await User.findById(userId);
        
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);
        
        // Clear OTP and set session
        await User.clearOTP(userId);
        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name
        };
        req.session.lastActivity = Date.now();

        // Set secure cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.json({
            success: true,
            message: 'Login successful'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add refresh token route
router.post('/refresh-token', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new Error('No refresh token provided');
        }

        const decoded = verifyToken(refreshToken);
        if (!decoded) {
            throw new Error('Invalid refresh token');
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Add this new route to your authController.js
router.get('/check-auth', (req, res) => {
    console.log('=== Auth Check ===');
    console.log('Session:', req.session);
    console.log('Cookies:', req.cookies);
    
    res.json({
        isAuthenticated: !!req.session.user,
        sessionInfo: {
            id: req.sessionID,
            user: req.session.user || null,
            lastActivity: req.session.lastActivity,
        },
        tokens: {
            hasAccessToken: !!req.cookies.accessToken,
            hasRefreshToken: !!req.cookies.refreshToken
        }
    });
});

// Add verification endpoint for backup email
router.post('/verify-backup-email', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { verificationCode } = req.body;
        
        const result = await User.verifyBackupEmail(userId, verificationCode);
        
        if (result) {
            res.json({ 
                success: true, 
                message: 'Backup email verified successfully!' 
            });
        } else {
            throw new Error('Invalid verification code');
        }
    } catch (error) {
        console.error('Backup email verification error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add a test endpoint
router.post('/test-backup-email', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        if (!user.backup_email || !user.backup_email_verified) {
            throw new Error('No verified backup email found');
        }
        
        // Send a test message
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.backup_email,
            subject: 'Backup Email Test',
            html: `
                <h1>Backup Email Test</h1>
                <p>This is a test message to confirm your backup email is working correctly.</p>
                <p>If you received this, your backup email is properly configured!</p>
            `
        });
        
        res.json({
            success: true,
            message: 'Test email sent to your backup email'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add this new route
router.get('/settings', (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.render('settings');
});

// Add backup email route
router.post('/add-backup-email', async (req, res) => {
    try {
        if (!req.session.user) {
            throw new Error('User not authenticated');
        }

        const userId = req.session.user.id;
        const { backupEmail } = req.body;

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save backup email and verification code
        await User.updateBackupEmail(userId, backupEmail, verificationCode);

        // Send verification email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: backupEmail,
            subject: 'Verify Your Backup Email',
            html: `
                <h1>Backup Email Verification</h1>
                <p>Your verification code is: <strong>${verificationCode}</strong></p>
                <p>Enter this code to verify your backup email.</p>
            `
        });

        res.json({ 
            success: true, 
            message: 'Please check your backup email for verification code'
        });

    } catch (error) {
        console.error('Backup email setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add sensitive data route
router.post('/update-sensitive-data', async (req, res) => {
    try {
        if (!req.session.user) {
            throw new Error('User not authenticated');
        }

        const userId = req.session.user.id;
        const { phone, address } = req.body;

        await User.updateSensitiveData(userId, { phone, address });

        res.json({
            success: true,
            message: 'Sensitive data updated successfully'
        });
    } catch (error) {
        console.error('Update sensitive data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get sensitive data route
router.get('/sensitive-data', async (req, res) => {
    try {
        if (!req.session.user) {
            throw new Error('User not authenticated');
        }

        const userId = req.session.user.id;
        const data = await User.getSensitiveData(userId);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Get sensitive data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this new route
router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.render('profile');
});

// Add this test route
router.get('/test-security', async (req, res) => {
    try {
        if (!req.session.user) {
            throw new Error('Not authenticated');
        }

        // Get user's sensitive data
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        const sensitiveData = await User.getSensitiveData(userId);

        // Check if data exists and is encrypted
        const encryption = {
            hasEncryptedPhone: false,
            hasEncryptedAddress: false
        };

        if (sensitiveData) {
            encryption.hasEncryptedPhone = !!sensitiveData.phone;
            encryption.hasEncryptedAddress = !!sensitiveData.address;
        }

        // Security headers
        const securityHeaders = {
            'X-XSS-Protection': '1; mode=block',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };

        // Add headers to response
        Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        res.json({
            success: true,
            encryption: encryption,
            rateLimiting: {
                enabled: true,
                remaining: 100, // Example value
                resetTime: Date.now() + (60 * 1000) // 1 minute from now
            },
            securityHeaders: securityHeaders,
            httpsEnabled: req.secure,
            sessionSecure: req.session.cookie.secure
        });

    } catch (error) {
        console.error('Security test error:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message,
            encryption: { hasEncryptedPhone: false, hasEncryptedAddress: false },
            securityHeaders: {},
            rateLimiting: { enabled: false }
        });
    }
});

// Add this new route
router.get('/security-test', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.render('security-test');
});

module.exports = router; 