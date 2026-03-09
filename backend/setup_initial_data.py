"""
One-time setup: register admin user AngelValkov and import bulk-upload-sporx-two-articles.json.
Run with backend server: uvicorn main:app --reload
Usage: python setup_initial_data.py
"""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"

def req(path, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def main():
    # 1) Register first user (admin)
    print("Registering AngelValkov...")
    try:
        res = req("/api/auth/register", method="POST", body=json.dumps({
            "username": "AngelValkov",
            "password": "780428Rady!"
        }).encode())
        token = res["access_token"]
        print("  OK. User:", res["user"]["username"], res["user"]["role"])
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  Server error {e.code}: {body}")
        if "403" in str(e) or "Registration disabled" in body:
            print("  User already exists, trying login...")
            res = req("/api/auth/login", method="POST", body=json.dumps({
                "username": "AngelValkov",
                "password": "780428Rady!"
            }).encode())
            token = res["access_token"]
            print("  OK. Logged in.")
        else:
            raise

    # 2) Bulk import (file in project root)
    import os
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bulk_path = os.path.join(root, "bulk-upload-sporx-two-articles.json")
    with open(bulk_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    print("Importing bulk from", bulk_path, "...")
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    req_obj = urllib.request.Request(
        BASE + "/api/import-bulk",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req_obj) as r:
            result = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  Import error {e.code}:", e.read().decode())
        raise
    print("  sites_created:", result.get("sites_created"), "sites_matched:", result.get("sites_matched"))
    print("  pages_created:", result.get("pages_created"), "pages_matched:", result.get("pages_matched"))
    print("  parsed_created:", result.get("parsed_created"), "parsed_updated:", result.get("parsed_updated"))
    if result.get("errors"):
        print("  errors:", result["errors"])
    print("Done.")

if __name__ == "__main__":
    main()
