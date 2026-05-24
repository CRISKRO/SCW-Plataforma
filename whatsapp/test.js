const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  },
});

client.on('ready', async () => {
  console.log('Client is ready!');
  try {
    console.log('Testing getNumberId with 524436163135');
    // We add a race timeout to see if it hangs
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));
    const result = await Promise.race([client.getNumberId('524436163135'), timeout]);
    console.log('Result 1:', result);
    
    console.log('Testing getNumberId with 5214436163135');
    const result2 = await Promise.race([client.getNumberId('5214436163135'), timeout]);
    console.log('Result 2:', result2);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
});

client.initialize();
