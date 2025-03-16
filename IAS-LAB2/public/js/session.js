document.addEventListener('DOMContentLoaded', () => {
    let inactivityTimeout;
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes
    const LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes

    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(showWarning, WARNING_TIME);
    }

    function showWarning() {
        const remainingTime = Math.floor((LOGOUT_TIME - WARNING_TIME) / 1000);
        const warning = confirm(`Your session will expire in ${remainingTime} seconds. Would you like to stay logged in?`);
        
        if (warning) {
            // Refresh the session
            fetch('/auth/refresh-token', {
                method: 'POST',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resetInactivityTimer();
                } else {
                    window.location.href = '/auth/login';
                }
            })
            .catch(() => {
                window.location.href = '/auth/login';
            });
        } else {
            setTimeout(() => {
                window.location.href = '/auth/login';
            }, remainingTime * 1000);
        }
    }

    // Reset timer on user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });

    // Initial timer start
    resetInactivityTimer();
}); 