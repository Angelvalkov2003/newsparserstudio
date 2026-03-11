@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  set PY=.venv\Scripts\python.exe
) else (
  set PY=py
)
echo Starting backend on http://127.0.0.1:8000 ...
echo Leave this window open. Then open http://localhost:5173 and login.
echo (Uses .venv so pymongo and other deps are found.)
"%PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
