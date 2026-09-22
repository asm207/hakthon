"""Password hashing with scrypt (Python standard library)."""
import hashlib
import hmac
import secrets

N, R, P, DKLEN = 2**14, 8, 1, 32


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=N, r=R, p=P, dklen=DKLEN)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    return f"scrypt${salt.hex()}${_derive(password, salt).hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        # Still do the work so a missing account takes as long as a wrong password.
        _derive(password, b"\x00" * 16)
        return False
    try:
        _, salt_hex, hash_hex = stored.split("$")
        return hmac.compare_digest(_derive(password, bytes.fromhex(salt_hex)), bytes.fromhex(hash_hex))
    except ValueError:
        return False
