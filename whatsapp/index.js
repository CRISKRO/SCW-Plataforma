const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Store OTP codes temporarily: { phone: { code, expiresAt } }
const otpStore = new Map();

// Store latest QR for browser display
let latestQR = null;
let clientReady = false;

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  },
});

client.on('qr', async (qr) => {
  latestQR = qr;
  // Also print in terminal (small)
  console.log('\n📱 Nuevo QR generado. Ábrelo en el navegador: http://localhost:3001/qr\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  clientReady = true;
  latestQR = null;
  console.log('\n✅ WhatsApp conectado y listo para enviar mensajes.\n');
});

client.on('auth_failure', () => {
  clientReady = false;
  console.error('❌ Falló la autenticación de WhatsApp.');
});

client.on('disconnected', (reason) => {
  clientReady = false;
  console.log('⚠️  WhatsApp desconectado:', reason);
});

client.initialize();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
  let p = phone.replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) {
    p = '+52' + p.replace(/^0/, '');
  }
  const digits = p.replace('+', '');
  return digits + '@c.us';
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// QR Code page — scan this in WhatsApp to link
app.get('/qr', async (req, res) => {
  if (clientReady) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>WhatsApp SCW</title>
      <meta charset="utf-8">
      <style>body{background:#111;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:24px;}</style>
      </head>
      <body>
        <h1 style="color:#25D366">✅ WhatsApp Conectado</h1>
        <p style="color:#aaa">El microservicio está listo para enviar mensajes.</p>
      </body></html>
    `);
  }

  if (!latestQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>WhatsApp SCW</title>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="3">
      <style>body{background:#111;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:24px;}</style>
      </head>
      <body>
        <h1>⏳ Generando QR...</h1>
        <p style="color:#aaa">Esta página se actualizará sola. Espera unos segundos.</p>
      </body></html>
    `);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(latestQR, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp SCW — Escanea el QR</title>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="30">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #111;
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 24px;
            padding: 40px;
          }
          h1 { font-size: 24px; }
          p { color: #aaa; text-align: center; max-width: 400px; line-height: 1.6; }
          .qr-wrap {
            background: white;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 0 60px rgba(37,211,102,0.3);
          }
          .steps {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 20px 24px;
            max-width: 400px;
          }
          .steps ol { padding-left: 20px; line-height: 2; color: #ccc; }
          .badge {
            background: #25D366;
            color: #000;
            font-weight: bold;
            padding: 6px 16px;
            border-radius: 999px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <span class="badge">📱 SCW — Vinculación WhatsApp</span>
        <h1>Escanea este QR</h1>

        <div class="qr-wrap">
          <img src="${qrDataUrl}" width="360" height="360" alt="QR WhatsApp" />
        </div>

        <div class="steps">
          <ol>
            <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
            <li>Toca los 3 puntos → <strong>Dispositivos vinculados</strong></li>
            <li>Toca <strong>Vincular un dispositivo</strong></li>
            <li>Escanea este código QR</li>
          </ol>
        </div>

        <p style="font-size:13px;color:#555">Esta página se actualiza automáticamente cada 30 segundos.</p>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generando QR.');
  }
});

// Status check
app.get('/status', (req, res) => {
  res.json({ ready: clientReady, hasQR: !!latestQR });
});

// Send OTP
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'El campo "phone" es requerido.' });

  if (!clientReady) {
    return res.status(503).json({
      error: 'WhatsApp no está conectado. Escanea el QR en: http://localhost:3001/qr'
    });
  }

  const code = generateOTP();
  const whatsappId = normalizePhone(phone);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

  otpStore.set(phone, { code, expiresAt });

  const message =
    `🥊 *SCW — Código de Verificación*\n\n` +
    `Tu código para el SCW Dojo es:\n\n` +
    `*${code}*\n\n` +
    `⏳ Válido por 10 minutos.\n` +
    `Si no solicitaste esto, ignora el mensaje.`;

  try {
    await client.sendMessage(whatsappId, message);
    console.log(`📤 Código enviado a ${phone}`);
    res.json({ success: true, message: 'Código enviado por WhatsApp.' });
  } catch (error) {
    console.error('Error enviando:', error.message);
    res.status(500).json({ error: 'No se pudo enviar. Verifica que el número esté en WhatsApp.' });
  }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Se requieren "phone" y "code".' });

  const stored = otpStore.get(phone);
  if (!stored) return res.status(400).json({ error: 'No hay código activo. Solicita uno nuevo.' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'El código expiró. Solicita uno nuevo.' });
  }
  if (stored.code !== String(code)) {
    return res.status(400).json({ error: 'Código incorrecto. Intenta de nuevo.' });
  }

  otpStore.delete(phone);
  console.log(`✅ Verificado: ${phone}`);
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Microservicio WhatsApp en http://localhost:${PORT}`);
  console.log(`📱 Para ver el QR abre: http://localhost:${PORT}/qr\n`);
});
