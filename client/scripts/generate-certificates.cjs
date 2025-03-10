const mkcert = require('mkcert');
const fs = require('fs').promises;
const path = require('path');

async function generateCertificates() {
  try {
    console.log('Generating SSL certificates...');
    
    // Create ssl directory if it doesn't exist
    await fs.mkdir('ssl', { recursive: true });
    
    // Create a Certificate Authority
    const ca = await mkcert.createCA({
      organization: 'Social Media App Dev CA',
      countryCode: 'IN',
      state: 'Delhi',
      locality: 'New Delhi',
      validityDays: 365
    });
    
    // Create certificates for localhost
    const cert = await mkcert.createCert({
      domains: ['localhost', '127.0.0.1'],
      validityDays: 365,
      caKey: ca.key,
      caCert: ca.cert
    });
    
    // Save the certificates
    await fs.writeFile('ssl/key.pem', cert.key);
    await fs.writeFile('ssl/cert.pem', cert.cert);
    await fs.writeFile('ssl/ca.pem', ca.cert);
    
    console.log('SSL certificates generated successfully!');
  } catch (error) {
    console.error('Error generating certificates:', error);
    process.exit(1);
  }
}

generateCertificates(); 