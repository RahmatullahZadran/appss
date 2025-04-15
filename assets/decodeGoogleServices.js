const fs = require('fs');
const path = require('path');

// Get the base64 encoded GOOGLE_SERVICES_JSON from the environment variables
const googleServicesJsonBase64 = process.env.GOOGLE_SERVICES_JSON_BASE64;

// Convert base64 to a buffer
const googleServicesJsonBuffer = Buffer.from(googleServicesJsonBase64, 'base64');

// Write the decoded file to the assets folder
const outputPath = path.join(__dirname, 'assets', 'google-services.json');
fs.writeFileSync(outputPath, googleServicesJsonBuffer);
