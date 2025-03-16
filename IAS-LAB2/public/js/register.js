console.log('Register script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const registerForm = document.getElementById('registerForm');
    console.log('Register form:', registerForm);

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                };

                console.log('Sending registration data:', formData); // Debug log

                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                console.log('Server response:', data); // Debug log

                if (data.success) {
                    alert(data.message || 'Registration successful! Please check your email for verification.');
                    window.location.href = '/auth/login';
                } else {
                    throw new Error(data.error || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error); // Debug log
                alert(error.message);
            }
        });
    } else {
        console.error('Register form not found');
    }

    document.getElementById('backupEmailForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/auth/add-backup-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    backupEmail: document.getElementById('backupEmail').value
                })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('verificationSection').style.display = 'block';
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to set up backup email');
        }
    });
}); 