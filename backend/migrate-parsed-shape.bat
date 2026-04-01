@echo off
cd /d "%~dp0"
.\.venv\Scripts\python.exe migrate-parsed-shape.py
