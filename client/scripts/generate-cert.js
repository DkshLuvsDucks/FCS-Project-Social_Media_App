import mkcert from 'mkcert';
import { writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

async function generateCerts() {
  // Create certificates directory if it doesn't exist
  await mkdir('certificates', { recursive: true });

  // create a certificate authority
  const ca = await mkcert.createCA({
    organization: 'Social Media App Dev CA',
    countryCode: 'IN',
    state: 'Delhi',
    locality: 'New Delhi',
    validityDays: 365
  });

  // create a certificate signed by that CA
  const cert = await mkcert.createCert({
    domains: ['127.0.0.1', 'localhost'],
    validityDays: 365,
    caKey: ca.key,
    caCert: ca.cert
  });

  writeFileSync('certificates/cert.pem', cert.cert);
  writeFileSync('certificates/key.pem', cert.key);
  writeFileSync('certificates/ca.pem', ca.cert);
  
  console.log('Generated new certificates in the certificates directory');
  console.log('Please import certificates/ca.pem into your browser as a trusted root certificate');
}

generateCerts().catch(console.error); 