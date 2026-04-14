# News Parser Studio – FastAPI + MongoDB

## Run With Docker (recommended)

From the project root:

```powershell
docker compose up --build -d
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- MongoDB: `mongodb://localhost:27017`

Create initial admin user (run once, after containers are up):

```powershell
docker compose exec backend python -c "from app.database import connect_db,get_db; from app.auth_utils import hash_password; connect_db(); db=get_db(); db['users'].update_one({'username':'AngelValkov','is_guest':{'$ne':True}}, {'$set': {'username':'AngelValkov','hashed_password':hash_password('780428'),'role':'admin','is_guest':False}}, upsert=True); print('Admin OK')"
```

Stop:

```powershell
docker compose down
```

Stop and remove MongoDB data volume too:

```powershell
docker compose down -v
```

## Docker + local MySQL (SQL sync)

To sync data from a local MySQL database into MongoDB, the backend container must connect to MySQL running on your host machine.

Requirements:

- MySQL is running locally on Windows (default port `3306`)
- Database exists: `tpf2`
- User exists: `tpf_user` with access to `tpf2`
- Docker Desktop is running

In `docker-compose.yml` under `services.backend.environment`, set:

```yaml
DB_HOST: host.docker.internal
DB_PORT: "3306"
DB_NAME: tpf2
DB_USER: tpf_user
DB_PASS: 780428Rady!
SQL_SYNC_ENABLED: "true"
SQL_SYNC_BATCH_SIZE: "200"
```

Notes:

- `DB_HOST` must be `host.docker.internal` (not `localhost`) because the backend runs inside a container.
- Keep Mongo as `MONGODB_URI: mongodb://mongodb:27017` inside Docker.

Apply changes:

```powershell
docker compose up -d --build
```

Run full SQL sync (resets checkpoint to 0 first):

```powershell
docker compose exec backend python run-sql-sync-full.py
```

Run incremental SQL sync (continues from last checkpoint):

```powershell
docker compose exec backend python run-sql-sync.py
```

## Local Run (without Docker)

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend (new terminal):

```powershell
cd frontend
npm install
npm run dev
```
