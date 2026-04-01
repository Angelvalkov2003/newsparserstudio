from app.database import close_db, connect_db
from app.sql_sync import run_sql_sync


def main():
    connect_db()
    try:
        result = run_sql_sync()
        print(result)
    finally:
        close_db()


if __name__ == "__main__":
    main()
