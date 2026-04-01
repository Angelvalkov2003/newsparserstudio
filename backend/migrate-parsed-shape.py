import json

from app.database import connect_db, close_db, get_db
from app.sql_sync import _normalize_parsed_obj


def main():
    connect_db()
    try:
        db = get_db()
        cursor = db["parsed"].find({}, {"_id": 1, "data": 1})

        checked = 0
        updated = 0
        skipped = 0

        for doc in cursor:
            checked += 1
            raw = doc.get("data")
            if not raw or not isinstance(raw, str):
                skipped += 1
                continue

            try:
                obj = json.loads(raw)
            except Exception:
                skipped += 1
                continue

            normalized = _normalize_parsed_obj(obj)
            new_raw = json.dumps(normalized, ensure_ascii=False)
            if new_raw == raw:
                continue

            db["parsed"].update_one({"_id": doc["_id"]}, {"$set": {"data": new_raw}})
            updated += 1

        print(
            {
                "checked": checked,
                "updated": updated,
                "skipped": skipped,
            }
        )
    finally:
        close_db()


if __name__ == "__main__":
    main()
