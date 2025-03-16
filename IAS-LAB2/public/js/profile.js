document.addEventListener('DOMContentLoaded', () => {
    const sensitiveDataForm = document.getElementById('sensitiveDataForm');
    loadCurrentData();

    sensitiveDataForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = {
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value
            };

            const response = await fetch('/auth/update-sensitive-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                alert('Information updated successfully!');
                loadCurrentData();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            alert('Failed to update information: ' + error.message);
        }
    });
});

async function loadCurrentData() {
    try {
        const response = await fetch('/auth/sensitive-data');
        const data = await response.json();
        
        if (data.success) {
            const currentDataDiv = document.getElementById('currentData');
            currentDataDiv.innerHTML = `
                <p><strong>Phone:</strong> ${data.data.phone || 'Not set'}</p>
                <p><strong>Address:</strong> ${data.data.address || 'Not set'}</p>
            `;
        }
    } catch (error) {
        console.error('Failed to load current data:', error);
    }
} 