import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.config import JWT_SECRET

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7
PBKDF2_ITERATIONS = 260_000
SALT_LEN = 16
HASH_LEN = 32
DELIM = "$"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_LEN)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("ascii"),
        PBKDF2_ITERATIONS,
        dklen=HASH_LEN,
    )
    return f"{salt}{DELIM}{key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("$2") and hashed.count("$") >= 3:
        try:
            import bcrypt
            data = plain.encode("utf-8")[:72]
            return bcrypt.checkpw(data, hashed.encode("ascii"))
        except Exception:
            return False
    if DELIM not in hashed:
        return False
    salt, hexkey = hashed.split(DELIM, 1)
    try:
        key = bytes.fromhex(hexkey)
    except ValueError:
        return False
    expected = hashlib.pbkdf2_hmac(
        "sha256",
        plain.encode("utf-8"),
        salt.encode("ascii"),
        PBKDF2_ITERATIONS,
        dklen=HASH_LEN,
    )
    return secrets.compare_digest(key, expected)


def create_access_token(sub: str, role: str = "regular") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "role": role,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def generate_guest_username() -> str:
    return f"guest_{uuid.uuid4().hex[:12]}"
