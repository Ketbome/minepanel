
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '../host.key');

if (fs.existsSync(keyPath)) {
    console.log('Host key already exists.');
    process.exit(0);
}

console.log('Generating host key...');
const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

fs.writeFileSync(keyPath, privateKey);
console.log('Host key generated at ' + keyPath);
