document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const useBackupBtn = document.getElementById('useBackupBtn');
    const backupForm = document.getElementById('backupForm');
    const verifyBackupBtn = document.getElementById('verifyBackupBtn');
    const otpForm = document.getElementById('otpForm');
    const resendOTPButton = document.getElementById('resendOTP');
    const otpTimer = document.getElementById('otpTimer');
    let resendTimer;

    function startResendTimer() {
        let timeLeft = 60; // 60 seconds cooldown
        resendOTPButton.disabled = true;
        
        resendTimer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(resendTimer);
                resendOTPButton.disabled = false;
                otpTimer.textContent = 'You can now resend OTP';
                return;
            }
            
            otpTimer.textContent = `Resend OTP in ${timeLeft} seconds`;
            timeLeft--;
        }, 1000);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                };

                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.requireOTP) {
                    // Hide login form and show OTP form
                    loginForm.style.display = 'none';
                    otpForm.style.display = 'block';
                    startResendTimer();
                    alert(data.message || 'Please check your email for OTP');
                } else if (data.error) {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert(error.message);
            }
        });
    }

    if (resendOTPButton) {
        resendOTPButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/resend-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    alert(data.message);
                    startResendTimer();
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Resend OTP error:', error);
                alert(error.message);
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetch('/auth/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        otp: document.getElementById('otp').value
                    })
                });

                const data = await response.json();

                if (data.success) {
                    clearInterval(resendTimer);
                    window.location.href = '/dashboard';
                } else {
                    throw new Error(data.error || 'Invalid OTP');
                }
            } catch (error) {
                console.error('OTP verification error:', error);
                alert(error.message);
            }
        });
    }

    useBackupBtn.addEventListener('click', () => {
        loginForm.style.display = 'none';
        backupForm.style.display = 'block';
    });

    verifyBackupBtn.addEventListener('click', async () => {
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            backupCode: document.getElementById('backupCode').value
        };

        try {
            const response = await fetch('/auth/verify-backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = '/dashboard';
            } else {
                alert(data.error || 'Invalid backup code. Please try again.');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });
}); 