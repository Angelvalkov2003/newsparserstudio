# First run: user + bulk import

## 1. MongoDB in .env

`backend/.env` already contains **MONGODB_URI** for this project. If you change the Atlas user or password, update it there (encode special characters in the URI if needed).

## 2. Start the backend

In terminal:
```powershell
cd d:\mine\newsparserstudio\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Or double‑click `backend\start-backend.bat`.

Keep it running (do not close the window).

## 3. Registration + bulk import

In a **new** terminal:
```powershell
cd d:\mine\newsparserstudio\backend
.\.venv\Scripts\python.exe setup_initial_data.py
```
(If `setup_initial_data.py` is not present, create a user via the app or Swagger.)

The script:
- registers user **AngelValkov** with password **780428Rady!** (Admin role);
- imports `bulk-upload-sporx-two-articles.json` (Sporx + Finans Mynet articles).

## 4. Log in to the app

Start the frontend (if not running), open the app and log in with:
- **Username:** AngelValkov  
- **Password:** 780428Rady!

Then in MongoDB Atlas → Data Explorer → database **universal_markdown_builder** you will see collections `users`, `sites`, `pages`, `parsed`.
