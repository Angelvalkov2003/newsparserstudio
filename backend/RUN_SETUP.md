# Първо стартиране: потребител + bulk import

## 1. Парола за MongoDB в .env

Отвори `backend/.env` и **замени `<db_password>`** с реалната парола на потребителя **angelvalkov03_db_user** от MongoDB Atlas (Database Access → Edit → Password). Това е паролата за Atlas, не за приложението.

- Ако паролата съдържа **специални символи** (`!`, `@`, `#`, `$`, `%`, `:`, `/`, `?`), трябва да ги кодираш в URI: `!` → `%21`, `@` → `%40`, `#` → `%23`, `$` → `%24`, `%` → `%25`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`.
- При грешка "bad auth : authentication failed" провери в Atlas потребителя и паролата (или задай нова парола без специални символи).

Пример (парола без специални символи):
```
MONGODB_URI=mongodb+srv://angelvalkov03_db_user:MyRealAtlasPassword123@universalmarkdownbuilde.w2avogu.mongodb.net/?appName=UniversalMarkdownBuilderStudioCluster
```

## 2. Стартирай бекенда

В терминал:
```powershell
cd d:\programirane\newsparserstudio\backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Остави го да работи (не затваряй прозореца).

## 3. Регистрация + bulk import

В **нов** терминал:
```powershell
cd d:\programirane\newsparserstudio\backend
python setup_initial_data.py
```

Скриптът:
- регистрира потребител **AngelValkov** с парола **780428Rady!** (роля Admin);
- импортира `bulk-upload-sporx-two-articles.json` (Sporx + Finans Mynet статии).

## 4. Вход в приложението

Стартирай frontend (ако не работи), отвори приложението и влез с:
- **Username:** AngelValkov  
- **Password:** 780428Rady!

След това в MongoDB Atlas → Data Explorer → база **universal_markdown_builder** ще видиш колекциите `users`, `sites`, `pages`, `parsed`.
