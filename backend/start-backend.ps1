# Start backend (leave this window open). Uses .venv if present.
Set-Location $PSScriptRoot
$python = if (Test-Path ".venv\Scripts\python.exe") { ".venv\Scripts\python.exe" } else { "py" }
Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host "Leave this window open. Then open http://localhost:5173 and login." -ForegroundColor Yellow
& $python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
