require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { authenticateToken, checkUserActivity } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');
const expressLayouts = require('express-layouts');
const https = require('https');
const fs = require('fs');
const selfsigned = require('selfsigned');
const http = require('http');
const pwaDebug = require('./pwa-debug');
const os = require('os');

// Add this debugging section
console.log('=== Environment Variables Check ===');
console.log('Session Secret exists:', !!process.env.SESSION_SECRET);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);

// Middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 60 * 1000,
        sameSite: 'strict'
    }
}));

// Add this middleware to log session and token information
app.use((req, res, next) => {
    console.log('=== Request Debug Info ===');
    console.log('Session ID:', req.sessionID);
    console.log('User in Session:', req.session.user ? 'Yes' : 'No');
    console.log('Access Token:', req.cookies.accessToken ? 'Present' : 'Not Present');
    next();
});

// Middleware to check session timeout
app.use((req, res, next) => {
    if (req.session && req.session.lastActivity) {
        const currentTime = Date.now();
        const inactivityPeriod = currentTime - req.session.lastActivity;
        
        // If inactive for more than 30 minutes
        if (inactivityPeriod > 30 * 60 * 1000) {
            req.session.destroy();
            return res.status(440).json({ error: 'Session expired' });
        }
        
        // Update last activity time
        req.session.lastActivity = currentTime;
    }
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Debug route to check views directory
app.get('/debug', (req, res) => {
    const viewsPath = path.join(__dirname, 'views');
    const files = require('fs').readdirSync(viewsPath);
    res.json({
        viewsPath,
        files,
        currentDir: __dirname
    });
});

// Routes
const authRoutes = require('./controllers/authController');
app.use('/auth', authRoutes);

// Apply rate limiting to all routes
app.use('/auth', apiLimiter);

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Dashboard route (protected)
app.get('/dashboard', authenticateToken, checkUserActivity, (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.render('dashboard', { user: req.session.user });
});

// Add this route to test authentication
app.get('/test-auth', (req, res) => {
    res.render('auth-test');
});

// Add PWA support
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        } else if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        }
    }
}));

// Add security headers
const securityHeaders = require('./middleware/securityHeaders');
app.use(securityHeaders);

// Add layout support
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Add this before your routes
app.use(pwaDebug);

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
    algorithm: 'sha256',
    days: 30,
    keySize: 2048,
    extensions: [{
        name: 'subjectAltName',
        altNames: [
            { type: 2, value: 'localhost' },
            { type: 2, value: '192.168.1.32' }
        ]
    }]
});

// Save certificates
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
}
fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);

// Create HTTPS server
const httpsOptions = {
    key: pems.private,
    cert: pems.cert
};

// Create both HTTP and HTTPS servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(httpsOptions, app);

// COMMENT OUT the HTTP to HTTPS redirect to allow HTTP testing
/*
app.use((req, res, next) => {
    if (!req.secure) {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});
*/

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    const addresses = Object.values(os.networkInterfaces())
        .flat()
        .filter(item => !item.internal && item.family === 'IPv4')
        .map(item => item.address);
        
    console.log(`Server running on port ${PORT}`);
    console.log('Access the app on your phone using one of these URLs:');
    addresses.forEach(addr => {
        console.log(`http://${addr}:${PORT}`);
    });
});

// Add this route to your app
app.get('/pwa-test', (req, res) => {
    console.log('=== PWA Test Page Accessed ===');
    
    // Send a simple HTML page with PWA meta tags
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            
            <!-- iOS PWA Meta Tags - MUST be at the top -->
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
            <meta name="apple-mobile-web-app-title" content="SecureAuth">
            
            <!-- Viewport MUST come after Apple tags -->
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, minimal-ui">
            
            <!-- Apple Touch Icons - MUST include all sizes -->
            <link rel="apple-touch-icon" href="/images/icon-180x180.png">
            <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152x152.png">
            <link rel="apple-touch-icon" sizes="167x167" href="/images/icon-167x167.png">
            <link rel="apple-touch-icon" sizes="180x180" href="/images/icon-180x180.png">
            
            <!-- PWA Manifest -->
            <link rel="manifest" href="/manifest.json">
            
            <!-- Theme Color -->
            <meta name="theme-color" content="#4a90e2">
            
            <title>PWA Test</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    padding: 20px; 
                    margin: 0;
                    line-height: 1.5;
                }
                button { 
                    padding: 12px 20px; 
                    margin: 15px 0; 
                    background-color: #4a90e2; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-size: 16px;
                }
                .result-box {
                    background-color: #f5f5f5;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                }
                .status {
                    font-weight: bold;
                }
                .yes { color: green; }
                .no { color: red; }
                h1 { margin-top: 0; }
            </style>
        </head>
        <body>
            <h1>PWA Test Page</h1>
            <p>This page tests if your app is running as a PWA. Click the button below to check.</p>
            
            <button onclick="checkPWA()">Check PWA Status</button>
            <div id="result" class="result-box"></div>
            
            <div style="margin-top: 30px;">
                <h3>How to install as PWA:</h3>
                <ol>
                    <li>Tap the share button in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Name it "SecureAuth" and tap Add</li>
                    <li>Launch the app from your home screen</li>
                    <li>Come back to this page and tap the button again</li>
                </ol>
            </div>
            
            <script>
                // Check PWA status on page load
                window.addEventListener('load', function() {
                    checkPWA();
                });
                
                function checkPWA() {
                    const result = document.getElementById('result');
                    
                    // Check if running in standalone mode
                    const isStandalone = window.navigator.standalone || 
                                        window.matchMedia('(display-mode: standalone)').matches;
                    
                    // Get detailed info
                    const userAgent = navigator.userAgent;
                    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
                    const isSafari = /safari/i.test(userAgent);
                    const protocol = window.location.protocol;
                    const host = window.location.host;
                    
                    // Build result HTML
                    result.innerHTML = '<h2>PWA Status Check Results:</h2>' +
                        '<p><span class="status">Running as PWA: </span>' + 
                        '<span class="' + (isStandalone ? 'yes' : 'no') + '">' + 
                        (isStandalone ? 'Yes ✓' : 'No ✗') + '</span></p>' +
                        '<p><span class="status">iOS Device: </span>' + 
                        '<span class="' + (isIOS ? 'yes' : 'no') + '">' + 
                        (isIOS ? 'Yes ✓' : 'No ✗') + '</span></p>' +
                        '<p><span class="status">Protocol: </span>' + protocol + '</p>' +
                        '<p><span class="status">Host: </span>' + host + '</p>' +
                        '<p><span class="status">User Agent: </span>' + userAgent + '</p>';
                    
                    // Send result to server for logging
                    fetch('/log-pwa-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            isStandalone,
                            isIOS,
                            isSafari,
                            userAgent,
                            protocol,
                            host
                        })
                    });
                }
            </script>
        </body>
        </html>
    `);
});

// Add a route to log PWA status
app.post('/log-pwa-status', (req, res) => {
    console.log('\n=== PWA Status Check ===');
    console.log('Is Standalone:', req.body.isStandalone);
    console.log('Is iOS Device:', req.body.isIOS);
    console.log('Is Safari:', req.body.isSafari);
    console.log('Protocol:', req.body.protocol);
    console.log('Host:', req.body.host);
    console.log('User Agent:', req.body.userAgent);
    res.json({ received: true });
}); 