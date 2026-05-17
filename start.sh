#!/bin/bash

# Script para iniciar la plataforma SCW (Backend, Frontend y WhatsApp)

echo "Iniciando Backend de Django..."
cd backend
source venv/bin/activate
python manage.py runserver &
BACKEND_PID=$!

echo "Iniciando Frontend de Next.js..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Iniciando Microservicio WhatsApp..."
cd ../whatsapp
node index.js &
WHATSAPP_PID=$!

echo "========================================================="
echo "✅ Servidores Iniciados Exitosamente"
echo "🌐 Frontend (Página Principal): http://localhost:3000"
echo "⚙️  Backend (API Django):        http://localhost:8000"
echo "📱 WhatsApp Microservicio:       http://localhost:3001"
echo "========================================================="
echo "👉 IMPORTANTE: Escanea el QR de WhatsApp en la terminal"
echo "   para activar el envío de mensajes."
echo "========================================================="
echo "Presiona CTRL+C para detener todos los servidores."

# Esperar a que el usuario presione CTRL+C
trap "echo 'Deteniendo servidores...'; kill $BACKEND_PID $FRONTEND_PID $WHATSAPP_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
