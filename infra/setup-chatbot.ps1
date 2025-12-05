# ========================================
# SETUP INSTRUCTIONS
# ========================================
# Follow these steps to get the chatbot running

# Step 1: Create the chatbot database
Write-Host "Step 1: Creating chatbot database..." -ForegroundColor Cyan
docker exec -i fhirdbserver psql -U admin -d postgres -f /chatbot-db-setup.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Database creation failed. Make sure PostgreSQL is running." -ForegroundColor Red
    Write-Host "Run: docker ps | findstr fhirdbserver" -ForegroundColor Yellow
    exit 1
}

# Step 2: Install dependencies
Write-Host "`nStep 2: Installing Node.js dependencies..." -ForegroundColor Cyan
Set-Location chatbot-service
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

# Step 3: Check for .env file
Write-Host "`nStep 3: Checking configuration..." -ForegroundColor Cyan
if (Test-Path .env) {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "📝 Please edit .env and add your GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host "   Get your API key from: https://ai.google.dev/" -ForegroundColor Cyan
    notepad .env
}

# Step 4: Ready to run
Write-Host "`n" + "="*50 -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "="*50 -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you've added your GEMINI_API_KEY to .env" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Open test-chat.html in your browser" -ForegroundColor White
Write-Host "`nTo start the dev server now, press Enter..." -ForegroundColor Yellow
Read-Host

npm run dev
