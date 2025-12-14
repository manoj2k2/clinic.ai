@echo off
REM MCP Healthcare Server Deployment Script
REM This script demonstrates how to deploy the MCP healthcare server
REM alongside the existing chatbot service

echo 🚀 Starting MCP Healthcare Server Deployment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Navigate to chatbot-service directory
cd /d "%~dp0\..\chatbot-service"

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build the TypeScript code
echo 🔨 Building TypeScript code...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

REM Start MCP Healthcare Server in background
echo 🏥 Starting MCP Healthcare Server...
start "MCP Healthcare Server" cmd /k "node dist/services/healthcare-mcp-server.js"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start the main chatbot service
echo 🤖 Starting Chatbot Service...
start "Chatbot Service" cmd /k "npm start"

echo ✅ MCP Healthcare Server and Chatbot Service started successfully!
echo 📋 Services running:
echo    - MCP Healthcare Server: http://localhost:3001 (MCP protocol)
echo    - Chatbot Service: http://localhost:3000
echo 🔗 Test the integration at: http://localhost:3000/test-chat.html

pause