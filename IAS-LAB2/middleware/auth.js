const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.redirect('/auth/login');
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        res.clearCookie('accessToken');
        return res.redirect('/auth/login');
    }
};

const checkUserActivity = (req, res, next) => {
    if (!req.session.lastActivity) {
        req.session.lastActivity = Date.now();
    }

    const inactivityPeriod = Date.now() - req.session.lastActivity;
    if (inactivityPeriod > 30 * 60 * 1000) { // 30 minutes
        req.session.destroy();
        res.clearCookie('accessToken');
        return res.redirect('/auth/login');
    }

    req.session.lastActivity = Date.now();
    next();
};

module.exports = { authenticateToken, checkUserActivity }; 