# Script para iniciar la plataforma SCW (Backend, Frontend y WhatsApp) en Windows

Write-Host "Iniciando Backend de Django..."
Set-Location backend
# Usar el Python del entorno virtual si existe
if (Test-Path "venv\Scripts\python.exe") {
    $pythonExe = ".\venv\Scripts\python.exe"
} else {
    Write-Host "ADVERTENCIA: No se encontro el entorno virtual en 'backend\venv'." -ForegroundColor Yellow
    Write-Host "Por favor, crea el entorno e instala las dependencias primero." -ForegroundColor Yellow
    $pythonExe = "python"
}
$backendProc = Start-Process $pythonExe -ArgumentList "manage.py runserver 0.0.0.0:8000" -PassThru -NoNewWindow

# Obtener la IP Local
$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -notmatch 'Loopback' | Select-Object -First 1).IPAddress
if ([string]::IsNullOrEmpty($LOCAL_IP)) {
    $LOCAL_IP = "127.0.0.1"
}

Write-Host "Iniciando Frontend de Next.js..."
Set-Location ..\frontend
$FRONTEND_PORT = 3000

# Verificar si el puerto está ocupado
$portOccupied = Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue
if ($portOccupied) {
    Write-Host "El puerto $FRONTEND_PORT está ocupado. Buscando un puerto libre..."
    foreach ($PORT in 3001..3004) {
        $check = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
        if (-not $check) {
            $FRONTEND_PORT = $PORT
            break
        }
    }
    Write-Host "Usando puerto $FRONTEND_PORT para el frontend"
}

# Iniciar Next.js frontend
$env:NEXT_PUBLIC_API_URL = "http://${LOCAL_IP}:8000/api"
$frontendProc = Start-Process npm -ArgumentList "run dev -- --hostname 0.0.0.0 --port $FRONTEND_PORT" -PassThru -NoNewWindow

Set-Location ..

Write-Host "========================================================="
Write-Host "Servidores Iniciados Exitosamente"
Write-Host "Frontend (Página Principal): http://localhost:$FRONTEND_PORT"
Write-Host "Backend (API Django):        http://localhost:8000"
if ($LOCAL_IP) {
  Write-Host "Frontend móvil:              http://${LOCAL_IP}:${FRONTEND_PORT}"
  Write-Host "Backend móvil (API):         http://${LOCAL_IP}:8000"
}
Write-Host "========================================================="
Write-Host "IMPORTANTE: Usa la dirección móvil en el teléfono"
Write-Host "   y no http://localhost, porque localhost en el móvil apunta al propio teléfono."
Write-Host "========================================================="
Write-Host "Presiona CTRL+C en esta ventana para detener todos los servidores."

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nDeteniendo servidores..."
    if ($frontendProc) { Stop-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue }
