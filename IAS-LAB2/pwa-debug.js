// PWA Debugging Middleware
const pwaDebug = (req, res, next) => {
    // Log basic request info
    console.log('\n=== PWA Debug Info ===');
    console.log('Time:', new Date().toLocaleTimeString());
    console.log('URL:', req.url);
    console.log('User Agent:', req.headers['user-agent']);
    
    // Check if request is from iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(req.headers['user-agent']);
    const isSafari = /safari/i.test(req.headers['user-agent']);
    console.log('iOS Device:', isIOS ? 'Yes' : 'No');
    console.log('Safari Browser:', isSafari ? 'Yes' : 'No');
    
    // Check if request is from standalone mode (PWA)
    const isStandalone = req.headers['x-requested-with'] === 'com.apple.mobilesafari';
    console.log('Standalone Mode:', isStandalone ? 'Yes' : 'No');
    
    // Log requested PWA assets
    if (req.url.includes('manifest.json')) {
        console.log('Manifest Requested: Yes');
    }
    
    if (req.url.includes('/images/icon')) {
        console.log('Icon Requested:', req.url);
    }
    
    // Continue with the request
    next();
};

module.exports = pwaDebug; 