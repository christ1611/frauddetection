@echo off
echo Starting Fraud Report System...
echo.

start "Backend" cmd /k "cd backend && node server.js"
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend : http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Reports saved to: backend\data\reports.txt
echo Images saved to : backend\uploads\
