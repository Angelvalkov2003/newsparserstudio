"""Single global 'Unique' site: get or create. Used for Unique/Guest user pages."""
from datetime import datetime, timezone


def get_or_create_unique_site(db, user_id: str) -> str:
    """Return the ObjectId (as str) of the Unique site. Create if missing."""
    doc = db["sites"].find_one({"name": "Unique"})
    if doc:
        return str(doc["_id"])
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "name": "Unique",
        "url": "",
        "created_by": user_id,
        "allowed_for": [],
        "created_at": now,
        "updated_at": now,
    }
    result = db["sites"].insert_one(doc)
    return str(result.inserted_id)
