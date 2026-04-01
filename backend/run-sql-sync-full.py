from app.database import close_db, connect_db, get_db
from app.sql_sync import CHECKPOINT_NAME, run_sql_sync


def main():
    connect_db()
    try:
        db = get_db()
        db["sync_checkpoints"].update_one(
            {"name": CHECKPOINT_NAME},
            {"$set": {"last_id": 0}},
            upsert=True,
        )
        result = run_sql_sync()
        print(result)
    finally:
        close_db()


if __name__ == "__main__":
    main()
