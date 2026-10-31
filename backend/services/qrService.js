/**
 * CampusFind 2.0 - QR Code Service
 * Generates dynamic, secure QR codes for campus found items in custody
 */

const QRCode = require('qrcode');

/**
 * Generates a unique, tamper-resistant QR Token
 */
function generateQRToken() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const numSuffix = Math.floor(Math.random() * 900 + 100);
  return `QR-FND-${timestamp}-${randomPart}-${numSuffix}`;
}

/**
 * Generates a Base64 Data URL representation of a QR Code
 * @param {string} token - The unique item qr_token
 * @param {string} baseUrl - Base URL for the campus verification page
 */
async function generateQRCodeDataURL(token, baseUrl = 'http://localhost:5000') {
  try {
    // Secure verification URL pointing to the CampusFind verification portal
    const verificationUrl = `${baseUrl}/pages/verify-item.html?token=${encodeURIComponent(token)}`;

    // Generate high-contrast, brand-aligned QR Code Data URL
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 250,
      color: {
        dark: '#004953', // Deep Teal (Brand Primary)
        light: '#FFFFFF' // Clean White Background
      }
    });

    return {
      success: true,
      token,
      verificationUrl,
      qrDataUrl
    };
  } catch (error) {
    console.error('[QRService Error]: Failed to generate QR Code:', error.message);
    throw new Error('QR Code generation failed.');
  }
}

module.exports = {
  generateQRToken,
  generateQRCodeDataURL
};

