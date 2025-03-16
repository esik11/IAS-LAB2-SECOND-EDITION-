document.addEventListener('DOMContentLoaded', () => {
    const backupEmailForm = document.getElementById('backupEmailForm');
    
    backupEmailForm.addEventListener('submit', async (e) => {
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

async function verifyBackupEmail() {
    try {
        const response = await fetch('/auth/verify-backup-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                verificationCode: document.getElementById('verificationCode').value
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Backup email verified successfully!');
            location.reload();
        }
    } catch (error) {
        alert('Failed to verify backup email');
    }
}

async function testBackupEmail() {
    try {
        const response = await fetch('/auth/test-backup-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (data.success) {
            alert('Test email sent! Please check your backup email.');
        }
    } catch (error) {
        alert('Failed to send test email');
    }
} 