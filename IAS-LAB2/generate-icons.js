const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to generate an icon
function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, size, size);

    // Simple lock icon (white circle with inner circle)
    ctx.fillStyle = '#ffffff';
    const outerRadius = size * 0.35;
    const innerRadius = size * 0.25;
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(size/2, size/2, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.arc(size/2, size/2, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toBuffer('image/png');
}

// Generate both sizes
[192, 512].forEach(size => {
    const iconBuffer = generateIcon(size);
    fs.writeFileSync(`public/images/icon-${size}x${size}.png`, iconBuffer);
    console.log(`Generated ${size}x${size} icon`);
}); 