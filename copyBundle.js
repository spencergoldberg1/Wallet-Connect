const fs = require('fs');
const path = require('path');

// Setup the source and destination directories
const sourceDir = path.join(__dirname, 'dist');
const destinationBaseDir = path.join(__dirname, 'public/src/wallet_connect');

// Function to copy a file from source to destination with error handling
function copyFile(sourceFile, destinationFile) {
    try {
        fs.copyFileSync(sourceFile, destinationFile);
        console.log(`Copied: ${path.basename(sourceFile)}`);
    } catch (error) {
        console.error(`Error copying ${sourceFile}: ${error.message}`);
    }
}

// Function to copy directories recursively with error handling
function copyDirectory(sourceDir, destinationDir) {
    try {
        // Ensure destination directory exists
        fs.mkdirSync(destinationDir, { recursive: true });
        
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
    } catch (error) {
        console.error(`Error processing directory ${sourceDir}: ${error.message}`);
    }
}

// Main execution with error handling
try {
    // Verify source directory exists
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source directory does not exist: ${sourceDir}`);
    }

    // Start copying process
    console.log(`Copying from ${sourceDir} to ${destinationBaseDir}`);
    copyDirectory(sourceDir, destinationBaseDir);
    console.log('Copy operation completed successfully');
} catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
}