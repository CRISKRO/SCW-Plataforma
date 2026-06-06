#!/bin/bash

# Script para iniciar la plataforma SCW (Backend, Frontend y WhatsApp)

echo "Iniciando Backend de Django..."
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '/src/ { for(i=1;i<=NF;i++) if($i=="src") print $(i+1) }' | head -n1)
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="127.0.0.1"
fi

echo "Iniciando Frontend de Next.js..."
cd ../frontend
FRONTEND_PORT=3000
if lsof -i tcp:$FRONTEND_PORT -t >/dev/null 2>&1; then
  echo "El puerto $FRONTEND_PORT está ocupado. Buscando un puerto libre..."
  for PORT in 3001 3002 3003 3004; do
    if ! lsof -i tcp:$PORT -t >/dev/null 2>&1; then
      FRONTEND_PORT=$PORT
      break
    fi
  done
  echo "Usando puerto $FRONTEND_PORT para el frontend"
fi
NEXT_PUBLIC_API_URL="http://$LOCAL_IP:8000/api" NEXT_PUBLIC_WHATSAPP_SERVICE="http://$LOCAL_IP:3001" npm run dev -- --hostname 0.0.0.0 --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo "Iniciando Microservicio WhatsApp..."
cd ../whatsapp
node index.js &
WHATSAPP_PID=$!

echo "========================================================="
echo "Servidores Iniciados Exitosamente"
echo "Frontend (Página Principal): http://localhost:$FRONTEND_PORT"
echo "Backend (API Django):        http://localhost:8000"
if [ -n "$LOCAL_IP" ]; then
  echo "Frontend móvil:             http://$LOCAL_IP:$FRONTEND_PORT"
  echo "Backend móvil (API):         http://$LOCAL_IP:8000"
  echo "WhatsApp móvil:              http://$LOCAL_IP:3001"
fi
echo "========================================================="
echo "IMPORTANTE: Usa la dirección móvil en el teléfono"
echo "   y no http://localhost, porque localhost en el móvil apunta al propio teléfono."
echo "========================================================="
echo "Presiona CTRL+C para detener todos los servidores."

# Esperar a que el usuario presione CTRL+C
trap "echo 'Deteniendo servidores...'; kill $BACKEND_PID $FRONTEND_PID $WHATSAPP_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
