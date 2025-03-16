document.addEventListener('DOMContentLoaded', () => {
    const regenerateBackupCodes = document.getElementById('regenerateBackupCodes');
    const resetMFA = document.getElementById('resetMFA');

    regenerateBackupCodes.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to generate new backup codes? Your old codes will no longer work.')) {
            return;
        }

        try {
            const response = await fetch('/auth/regenerate-backup-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const codesDisplay = document.createElement('div');
                codesDisplay.className = 'backup-codes-modal';
                codesDisplay.innerHTML = `
                    <div class="modal-content">
                        <h3>New Backup Codes</h3>
                        <p>Save these codes in a secure place:</p>
                        <div class="codes-list">
                            ${data.backupCodes.map(code => `<div class="code">${code}</div>`).join('')}
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()">Close</button>
                    </div>
                `;
                document.body.appendChild(codesDisplay);
            } else {
                alert(data.error || 'Failed to generate new backup codes.');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });

    resetMFA.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to reset your MFA device? You will need to set up a new device.')) {
            return;
        }

        try {
            const response = await fetch('/auth/reset-mfa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const mfaSetup = document.createElement('div');
                mfaSetup.className = 'mfa-setup-modal';
                mfaSetup.innerHTML = `
                    <div class="modal-content">
                        <h3>New MFA Setup</h3>
                        <p>Scan this QR code with your authenticator app:</p>
                        <img src="${data.mfaQrCode}" alt="QR Code">
                        <button onclick="this.parentElement.parentElement.remove(); window.location.reload()">Complete Setup</button>
                    </div>
                `;
                document.body.appendChild(mfaSetup);
            } else {
                alert(data.error || 'Failed to reset MFA device.');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    });
}); 