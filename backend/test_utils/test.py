"""
Simple test client for your FastAPI auth backend.

Supports:
    - user registration
    - user login

It sends exactly what your backend expects based on:

    def create_user(db: Session, user: UserCreate):
        # UserCreate:
        #   email: EmailStr
        #   auth_hash: str
        #   protected_vault_key: str
        #   protected_vault_key_iv: str

Usage examples:
    python test_client.py register
    python test_client.py login
    python test_client.py both
"""

import argparse
import base64
import hashlib
import secrets

import requests


# Default API base URL – change if needed
DEFAULT_BASE_URL = "http://localhost:8000/api/v1"


def derive_auth_hash(master_password: str) -> str:
    """
    Client-side derivation of AuthHash.

    In your real client, this will be PBKDF2/Argon2, Bitwarden-style.
    For testing, we just do a deterministic SHA-256 so:
        - the same master_password -> same auth_hash
        - register and login will match
    """
    return hashlib.sha256(master_password.encode("utf-8")).hexdigest()


def generate_fake_protected_vault_key() -> str:
    """
    Generate a dummy ProtectedVaultKey for testing.

    In a real client:
        - this would be the AES-encrypted account/vault key
    Here:
        - just random 32 bytes, base64-encoded
    """
    return base64.b64encode(secrets.token_bytes(32)).decode("ascii")


def generate_fake_iv() -> str:
    """
    Generate a dummy 16-byte IV (for AES) for testing, base64-encoded.
    """
    return base64.b64encode(secrets.token_bytes(16)).decode("ascii")


def register(session: requests.Session, register_url: str, email: str, master_password: str) -> None:
    auth_hash = derive_auth_hash(master_password)
    protected_vault_key = generate_fake_protected_vault_key()
    protected_vault_key_iv = generate_fake_iv()

    payload = {
        "email": email,
        "auth_hash": auth_hash,
        "protected_vault_key": protected_vault_key,
        "protected_vault_key_iv": protected_vault_key_iv,
    }

    print(f"\n[*] Registering user {email} …")
    resp = session.post(register_url, json=payload)
    print(f"[+] Status: {resp.status_code}")
    try:
        print("[+] Response JSON:", resp.json())
    except Exception:
        if resp.text:
            print("[+] Response text:", resp.text)
        else:
            print("[+] No response body.")


def login(session: requests.Session, login_url: str, email: str, master_password: str) -> None:
    auth_hash = derive_auth_hash(master_password)

    payload = {
        "email": email,
        "auth_hash": auth_hash,
    }

    print(f"\n[*] Logging in user {email} …")
    resp = session.post(login_url, json=payload)
    print(f"[+] Status: {resp.status_code}")
    # Try to print JSON if there is any (JWT or nothing, depending on your current code)
    token = None
    try:
        data = resp.json()
        print("[+] Response JSON:", data)
        token = data.get("access_token")
    except Exception:
        if resp.text:
            print("[+] Response text:", resp.text)
        else:
            print("[+] No response body.")

    # If we received a JWT access token, set Authorization header for the session
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
        print("[+] Authorization header set on session.")
        return token

    # Show cookies (useful if/when you switch to session-based auth)
    if session.cookies:
        print("[+] Cookies stored in session:")
        for cookie in session.cookies:
            print(f"    {cookie.name}={cookie.value}")
    else:
        print("[+] No cookies stored in session.")
    return None


def test_vault(session: requests.Session, base_url: str, do_post: bool = True, do_get: bool = True) -> None:
    """Test helper: optionally POST two vault items and/or GET all vault items.

    Args:
        session: requests session with Authorization header already set.
        base_url: API base URL (e.g. http://localhost:8000/api/v1)
        do_post: whether to POST two sample items.
        do_get: whether to GET and print items.
    """
    post_url = f"{base_url}/vault/items"
    get_url = f"{base_url}/vault/items"

    items_to_create = [
        {"encrypted_password": "FWAFR3WREFW", "site": "site1.pl"},
        {"encrypted_password": "HRAHREE5HET", "site": "site2.com"},
    ]

    if do_post:
        print("\n[*] Creating vault items …")
        for item in items_to_create:
            resp = session.post(post_url, json=item)
            print(f"[+] POST {post_url} -> {resp.status_code}")
            try:
                print("    ->", resp.json())
            except Exception:
                print("    -> no JSON response")

    if do_get:
        print("\n[*] Fetching vault items …")
        resp = session.get(get_url)
        print(f"[+] GET {get_url} -> {resp.status_code}")
        try:
            data = resp.json()
            print("[+] Items:")
            for item in data:
                print("    ", item)
        except Exception:
            print("[+] No JSON response on GET")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=["register", "login", "both"],
        help="What to do: register, login, or both sequentially.",
    )
    parser.add_argument(
        "--email",
        default="test@example.com",
        help="Email to use for testing (default: test@example.com)",
    )
    parser.add_argument(
        "--password",
        default="SuperSecretPassword123!",
        help="Master password to use for testing.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Base API URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--post-vault",
        action="store_true",
        help="Create two sample vault items after login.",
    )
    parser.add_argument(
        "--get-vault",
        action="store_true",
        help="Fetch vault items after login.",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    register_url = f"{base_url}/auth/register"
    login_url = f"{base_url}/auth/login"

    print(f"[*] Using base URL: {base_url}")
    print(f"    Register URL: {register_url}")
    print(f"    Login URL   : {login_url}")

    session = requests.Session()

    if args.action in ("register", "both"):
        register(session, register_url, args.email, args.password)

    if args.action in ("login", "both"):
        token = login(session, login_url, args.email, args.password)

        # If the user requested vault operations, ensure we have an access token
        if args.post_vault or args.get_vault:
            if not token:
                print("[!] No access token obtained; cannot run vault operations.")
            else:
                # default behavior: if neither flag provided but action was login/both, do nothing
                do_post = bool(args.post_vault)
                do_get = bool(args.get_vault)
                # If user passed --post-vault/--get-vault, run accordingly
                if do_post or do_get:
                    test_vault(session, base_url, do_post=do_post, do_get=do_get)


if __name__ == "__main__":
    main()