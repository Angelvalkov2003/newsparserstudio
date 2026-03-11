# First run: user + bulk import

## 1. MongoDB password in .env

Open `backend/.env` and **replace `<db_password>`** with the real password for user **angelvalkov03_db_user** from MongoDB Atlas (Database Access → Edit → Password). This is the Atlas password, not the app password.

- If the password contains **special characters** (`!`, `@`, `#`, `$`, `%`, `:`, `/`, `?`), encode them in the URI: `!` → `%21`, `@` → `%40`, `#` → `%23`, `$` → `%24`, `%` → `%25`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`.
- On "bad auth : authentication failed" check the Atlas user and password (or set a new password without special characters).

Example (password without special characters):
```
MONGODB_URI=mongodb+srv://angelvalkov03_db_user:MyRealAtlasPassword123@universalmarkdownbuilde.w2avogu.mongodb.net/?appName=UniversalMarkdownBuilderStudioCluster
```

## 2. Start the backend

In terminal:
```powershell
cd d:\programirane\newsparserstudio\backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Keep it running (do not close the window).

## 3. Registration + bulk import

In a **new** terminal:
```powershell
cd d:\programirane\newsparserstudio\backend
python setup_initial_data.py
```

The script:
- registers user **AngelValkov** with password **780428Rady!** (Admin role);
- imports `bulk-upload-sporx-two-articles.json` (Sporx + Finans Mynet articles).

## 4. Log in to the app

Start the frontend (if not running), open the app and log in with:
- **Username:** AngelValkov  
- **Password:** 780428Rady!

Then in MongoDB Atlas → Data Explorer → database **universal_markdown_builder** you will see collections `users`, `sites`, `pages`, `parsed`.
