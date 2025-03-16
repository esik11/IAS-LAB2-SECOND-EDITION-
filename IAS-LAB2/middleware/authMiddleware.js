document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.user) {
                    console.log('Login successful:', data.user);
                    // Redirect to dashboard or another page
                    window.location.href = '/dashboard';
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert(error.message);
            }
        });
    }
}); 