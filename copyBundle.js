const fs = require('fs');
const path = require('path');

// Setup the source and destination directories
const sourceDir = path.join(__dirname, 'dist');
const destinationBaseDir = path.join(__dirname, 'public/src/wallet_connect');

// Ensure the destination directory exists
fs.mkdirSync(destinationBaseDir, { recursive: true });

// Function to copy a file from source to destination
function copyFile(sourceFile, destinationFile) {
    fs.copyFileSync(sourceFile, destinationFile);
}

// Function to copy directories recursively
function copyDirectory(sourceDir, destinationDir) {
    fs.mkdirSync(destinationDir, { recursive: true }); // Ensure directory exists

    const files = fs.readdirSync(sourceDir);

    files.forEach(file => {
        const sourceFilePath = path.join(sourceDir, file);
        const destinationFilePath = path.join(destinationDir, file);
        const stats = fs.statSync(sourceFilePath);

        if (stats.isFile()) {
            copyFile(sourceFilePath, destinationFilePath);
        } else if (stats.isDirectory()) {
            copyDirectory(sourceFilePath, destinationFilePath);
        }
    });
}

// Start copying process from the specified source directory
copyDirectory(sourceDir, destinationBaseDir);
