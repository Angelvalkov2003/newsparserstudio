# Starting the app and viewing MongoDB records

## 1. Backend (.env and dependencies)

- `backend/.env` already contains **MONGODB_URI** for this project. Database name: default **universal_markdown_builder** (or set `MONGODB_DB_NAME` in `.env`).

Install dependencies (once):
```powershell
cd d:\programirane\newsparserstudio\backend
.\.venv\Scripts\pip install -r requirements.txt
```

## 2. Starting the backend

**Option A – batch file**
Double-click:
```
backend\start-backend.bat
```
Or in terminal:
```powershell
cd d:\programirane\newsparserstudio\backend
.\start-backend.bat
```

**Option B – manual**
```powershell
cd d:\programirane\newsparserstudio\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep the window open. On success you will see: `Application startup complete`.

**After changing backend code:** stop the server (Ctrl+C in the terminal) and start it again using one of the options above. Otherwise you may see 404 for new endpoints (e.g. `/api/pages/special/guest`).

- API: **http://127.0.0.1:8000**
- Swagger: **http://127.0.0.1:8000/docs**

**Check that the backend is up to date:** open **http://127.0.0.1:8000/api/health**. If you see `"special_routes": true`, the server has endpoints `/api/pages/special/guest` and `/special/unique`. If you get 404 or `special_routes` is missing, restart the backend from the `backend` folder (or check that no other process is using port 8000).

**If you see "MongoDB unreachable" or "SSL handshake failed" (503):** the app cannot connect to MongoDB Atlas. Try: (1) In MongoDB Atlas → Network Access, add your current IP (or 0.0.0.0/0 for testing). (2) In `backend/.env` add a new line `USE_SYSTEM_TLS=1`, save, and restart the backend. (3) Turn off VPN if you use one. (4) Run `pip install "pymongo[tls]"` in the backend venv.

## 3. Adding records (users)

### Via Swagger UI
1. Open **http://127.0.0.1:8000/docs**
2. Expand **POST /users**
3. Click **Try it out**
4. In the body enter e.g.:
   ```json
   {
     "name": "John",
     "email": "john@example.com",
     "age": 25
   }
   ```
5. **Execute** – you will get the new user `id`.

Repeat for more records.

### Via curl
```powershell
curl -X POST "http://127.0.0.1:8000/users" -H "Content-Type: application/json" -d "{\"name\":\"Jane\",\"email\":\"jane@example.com\",\"age\":30}"
```

### View all users via API
- Browser: **http://127.0.0.1:8000/users**
- Or Swagger: **GET /users** → Try it out → Execute

## 4. Viewing records in MongoDB (Atlas)

1. Log in at **https://cloud.mongodb.com** and open your project.
2. Left menu: **Database** → select cluster.
3. Click **Browse Collections**.
4. Select database **universal_markdown_builder** (or name from `MONGODB_DB_NAME`).
5. Open collection **users** – you will see all added users (fields `name`, `email`, `age`, `_id`).

If the database/collection is missing, it is created on first write (e.g. first successful **POST /users**).

## 5. (Optional) Frontend

In a **second** terminal:
```powershell
cd d:\programirane\newsparserstudio\frontend
npm install
npm run dev
```
Open **http://localhost:5173**.
