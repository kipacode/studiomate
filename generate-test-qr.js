const QRCode = require('qrcode');

const today = new Date().toISOString().split('T')[0];
const token = "KIPA-" + today.replace(/-/g, "") + "-STUDIO";

QRCode.toFile('valid-qr-code.png', token, {
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}, function (err) {
  if (err) throw err;
  console.log('Successfully generated valid-qr-code.png for token: ' + token);
});
