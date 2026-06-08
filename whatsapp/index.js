const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
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

// Global Client Reference
let client = null;

// ─── WhatsApp Client Async Initialization ─────────────────────────────────────────
(async () => {
  let authStrategy;
  const MONGODB_URI = process.env.MONGODB_URI;

  if (MONGODB_URI) {
    try {
      const mongoose = require('mongoose');
      const { MongoStore } = require('wwebjs-mongo');
      
      console.log('⏳ Conectando a MongoDB Atlas para persistencia de sesión...');
      await mongoose.connect(MONGODB_URI);
      console.log('📦 Conectado a MongoDB Atlas con éxito.');
      
      const store = new MongoStore({ mongoose: mongoose });
      authStrategy = new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 60000,
        clientId: 'scw-session'
      });
    } catch (err) {
      console.error('❌ Error de conexión con MongoDB. Usando sesión local temporal:', err);
      authStrategy = new LocalAuth({ dataPath: './.wwebjs_auth' });
    }
  } else {
    console.log('⚠️ MONGODB_URI no configurada. Usando sesión local (.wwebjs_auth).');
    authStrategy = new LocalAuth({ dataPath: './.wwebjs_auth' });
  }

  client = new Client({
    authStrategy: authStrategy,
    puppeteer: {
      headless: true,
      executablePath: process.env.RENDER || process.platform !== 'win32' ? undefined : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-audio-output',
        '--disable-software-rasterizer',
        '--disable-features=site-per-process',
        '--disable-features=Translate',
        '--disable-features=IsolateOrigins',
        '--js-flags=--max-old-space-size=150'
      ],
    },
  });

  client.on('qr', async (qr) => {
    latestQR = qr;
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
    console.log('⚠️ WhatsApp desconectado:', reason);
  });

  // Si usamos RemoteAuth, guardará los archivos del navegador automáticamente al estar listo
  client.on('remote_session_saved', () => {
    console.log('💾 Sesión de WhatsApp guardada con éxito en MongoDB Atlas.');
  });

  client.initialize();
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
  // Eliminar espacios, guiones, paréntesis y el signo +
  let p = phone.replace(/[\s\-\(\)\+]/g, '');
  
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('044') || p.startsWith('045')) p = p.slice(3); // Prefijos antiguos de México
  
  // Si el número tiene 10 dígitos, asumimos que es de México
  if (p.length === 10) {
    p = '52' + p;
  }
  // Si tiene 12 dígitos pero empieza con 1 (ej. US), lo dejamos como está.
  // La lógica principal confía en que si empieza con 52 o ya tiene su lada internacional, estará bien.

  return p + '@c.us';
}

const crypto = require('crypto');

function generateStatelessOTP(phone) {
  const hour = Math.floor(Date.now() / (1000 * 60 * 60)); 
  const secret = 'SCW_PRO_WRESTLING_2026';
  const data = `${phone}-${secret}-${hour}`;
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return parseInt(hash.substring(0, 8), 16).toString().substring(0, 6).padStart(6, '1');
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

// Send custom WhatsApp message
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Los campos "phone" y "message" son requeridos.' });
  }

  if (!clientReady) {
    return res.status(503).json({
      error: 'WhatsApp no está conectado. Escanea el QR en: http://localhost:3001/qr'
    });
  }

  let digits = normalizePhone(phone).replace('@c.us', '');

  try {
    let numberId = await client.getNumberId(digits);
    if (!numberId && digits.startsWith('52') && digits.length === 12) {
      numberId = await client.getNumberId('521' + digits.slice(2));
    }

    if (!numberId) {
      return res.status(400).json({ error: 'El número no está registrado en WhatsApp.' });
    }

    const whatsappId = numberId._serialized;

    await client.sendMessage(whatsappId, message);
    console.log(`📤 Mensaje enviado a ${phone} (${whatsappId})`);
    res.json({ success: true, message: 'Mensaje enviado por WhatsApp.' });
  } catch (error) {
    console.error('Error enviando mensaje personalizado:', error.message);
    res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
  }
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

  const code = generateStatelessOTP(phone);

  let digits = normalizePhone(phone).replace('@c.us', '');

  try {
    let numberId = await client.getNumberId(digits);
    if (!numberId && digits.startsWith('52') && digits.length === 12) {
      numberId = await client.getNumberId('521' + digits.slice(2));
    }

    if (!numberId) {
      return res.status(400).json({ error: 'El número no está registrado en WhatsApp.' });
    }

    const whatsappId = numberId._serialized;

    const message =
      `🥊 *SCW — Código de Verificación*\n\n` +
      `Tu código para el SCW Dojo es:\n\n` +
      `*${code}*\n\n` +
      `⏳ Válido temporalmente.\n` +
      `Si no solicitaste esto, ignora el mensaje.`;

    await client.sendMessage(whatsappId, message);
    console.log(`📤 Código enviado a ${phone} (${whatsappId})`);
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

  // Generate the expected code statelessly
  const expectedCode = generateStatelessOTP(phone);
  // Also check previous hour just in case they rolled over the hour boundary
  const prevHour = Math.floor(Date.now() / (1000 * 60 * 60)) - 1;
  const dataPrev = `${phone}-SCW_PRO_WRESTLING_2026-${prevHour}`;
  const hashPrev = crypto.createHash('md5').update(dataPrev).digest('hex');
  const expectedCodePrev = parseInt(hashPrev.substring(0, 8), 16).toString().substring(0, 6).padStart(6, '1');

  if (String(code) === expectedCode || String(code) === expectedCodePrev) {
    console.log(`✅ Verificado: ${phone}`);
    res.json({ success: true });
  } else {
    return res.status(400).json({ error: 'Código incorrecto o expirado. Intenta de nuevo.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Microservicio WhatsApp en http://localhost:${PORT}`);
  console.log(`📱 Para ver el QR abre: http://localhost:${PORT}/qr\n`);
});
