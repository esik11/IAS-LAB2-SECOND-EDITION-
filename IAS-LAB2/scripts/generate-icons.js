const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
    { width: 152, height: 152, name: 'icon-152x152.png' },
    { width: 167, height: 167, name: 'icon-167x167.png' },
    { width: 180, height: 180, name: 'icon-180x180.png' },
    { width: 192, height: 192, name: 'icon-192x192.png' },
    { width: 512, height: 512, name: 'icon-512x512.png' }
];

async function generateIcons() {
    // Make sure the images directory exists
    const imagesDir = path.join(__dirname, '../public/images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Use your original source icon (rename your original icon to source-icon.png)
    const sourceIcon = path.join(__dirname, '../public/images/source-icon.png');

    for (const size of sizes) {
        const outputPath = path.join(imagesDir, size.name);
        await sharp(sourceIcon)
            .resize(size.width, size.height)
            .png()
            .toFile(outputPath);
        console.log(`Generated ${size.name}`);
    }
}

generateIcons().catch(console.error); 