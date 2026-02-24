# NewsParserStudio

Full-stack web app: **FastAPI** backend + **React + Vite + TypeScript** frontend. JSON-based workflow, no database, local development only.

## Folder structure

```
newsparserstudio/
├── backend/                    # FastAPI app
│   ├── main.py                 # App entry, CORS, minimal routes
│   └── requirements.txt
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts         # Dev server + API proxy to backend
├── scraped_article_json_schema.json   # Reference schema for data_parsed
└── README.md
```

## Run locally

### 1. Backend (FastAPI)

```powershell
cd d:\programirane\newsparserstudio\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- API: **http://127.0.0.1:8000**
- Docs: **http://127.0.0.1:8000/docs**

### 2. Frontend (React + Vite)

```powershell
cd d:\programirane\newsparserstudio\frontend
npm install
npm run dev
```

- App: **http://localhost:5173**
- Vite proxies `/api/*` to `http://127.0.0.1:8000/*` (use `/api/...` in frontend for backend calls).

## Key config files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, CORS for localhost:5173, root + health routes |
| `backend/requirements.txt` | fastapi, uvicorn, python-multipart |
| `frontend/vite.config.ts` | React plugin, dev server proxy `/api` → backend:8000 |
| `frontend/package.json` | React 19, Vite 7, TypeScript 5.9 |
| `scraped_article_json_schema.json` | Reference schema for `data_parsed` (no validation yet) |

## Next steps

1. **Backend**: Add routes for JSON upload, JSON response, and edited-JSON download (no persistence).
2. **Frontend**: Add UI for upload, editing, visualization, and in-memory state (no components built yet).
3. **Integration**: Frontend calls backend via `/api/...`; keep all state in memory.

No database, no authentication; local development only.
