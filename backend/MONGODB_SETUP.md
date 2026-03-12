# MongoDB setup

1. `backend/.env` already contains **MONGODB_URI** for this project. To use another cluster, replace it. Set **JWT_SECRET** to a random string in production.

2. First user (admin): if the database has no users, you can create the first one via:
   ```bash
   curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"yourpassword\"}"
   ```
   Or use the Login page after implementing a "Register" link that calls `POST /api/auth/register` (only works when there are 0 users).

3. Roles:
   - **Guest** – sees only own sites/pages/parsed; created via "Continue as guest".
   - **Admin** – sees and edits everything; creates all non-guest users; can set `allowed_for`.
   - **Regular** – created by admin; sees own items + items where they are in `allowed_for`.

4. Visibility: each site, page, and parsed has `created_by` (user id) and `allowed_for` (list of user ids). A user sees an item if they are the creator, or in `allowed_for`, or are admin. Only admin can set `allowed_for` (future UI: PATCH `/api/sites/{id}/allowed-for`, etc.).
