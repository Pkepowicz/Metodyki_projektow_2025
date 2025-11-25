"""
Simple test client for FastAPI backend.

Supports:
    - user registration
    - user login
    - vault operations (POST/GET)
    - password change with vault rotation

Usage examples:
    python test.py register
    python test.py login
    python test.py both (register and login)
    python test.py vault-post
    python test.py vault-get
    python test.py vault-both
    python test.py change-password --new-password "NewPass123!"
"""

import argparse
import base64
import hashlib
import secrets
from typing import Optional

import requests


# Default API base URL – change if needed
DEFAULT_BASE_URL = "http://localhost:8000/api/v1"


def derive_auth_hash(master_password: str) -> str:
    """
    Client-side derivation of AuthHash.

    In real client, this will be PBKDF2/Argon2, Bitwarden-style.
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


def generate_fake_ciphertext() -> str:
    """
    Generate a dummy ciphertext string for vault item passwords.
    """
    return base64.b64encode(secrets.token_bytes(24)).decode("ascii")


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


def login( session: requests.Session, login_url: str, email: str, master_password: str) -> Optional[str]:
    auth_hash = derive_auth_hash(master_password)

    payload = {
        "email": email,
        "auth_hash": auth_hash,
    }

    print(f"\n[*] Logging in user {email} …")
    resp = session.post(login_url, json=payload)
    print(f"[+] Status: {resp.status_code}")
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

    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
        print("[+] Authorization header set on session.")
        return token

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

    if do_post:
        items_to_create = [
            {"encrypted_password": generate_fake_ciphertext(), "site": "site1.pl"},
            {"encrypted_password": generate_fake_ciphertext(), "site": "site2.com"},
        ]

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


def change_password_and_rotate(session: requests.Session,change_url: str,vault_get_url: str,
                               current_password: str, new_password: str) -> None:
    """
    Test helper: performs change-password + vault rotation flow:

    1. Assumes the session already has Authorization header set (login done).
    2. Fetches existing vault items.
    3. Builds a rotation payload:
        - current_auth_hash
        - new_auth_hash
        - new protected vault key + IV
        - items: same ids/owner_ids/sites, new ciphertexts
    4. Calls POST /auth/change-password.
    """
    print("\n[*] Fetching existing vault items for rotation …")
    resp = session.get(vault_get_url)
    print(f"[+] GET {vault_get_url} -> {resp.status_code}")
    try:
        items = resp.json()
    except Exception:
        print("[!] Could not parse vault items JSON; aborting rotation.")
        return

    print(f"[+] Retrieved {len(items)} vault items")

    rotated_items = []
    for item in items:
        rotated_items.append(
            {
                "id": item["id"],
                "owner_id": item["owner_id"],
                "site": item["site"],
                "encrypted_password": generate_fake_ciphertext(),
            }
        )

    payload = {
        "current_auth_hash": derive_auth_hash(current_password),
        "new_auth_hash": derive_auth_hash(new_password),
        "new_protected_vault_key": generate_fake_protected_vault_key(),
        "new_protected_vault_key_iv": generate_fake_iv(),
        "items": rotated_items,
    }

    print("\n[*] Calling /auth/change-password with rotation payload …")
    resp = session.post(change_url, json=payload)
    print(f"[+] POST {change_url} -> {resp.status_code}")
    try:
        print("[+] Response JSON:", resp.json())
    except Exception:
        if resp.text:
            print("[+] Response text:", resp.text)
        else:
            print("[+] No response body (expected for 204).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=["register", "login", "both", "vault-post", "vault-get", "vault-both", "change-password"],
        help="What to do.",
    )
    parser.add_argument(
        "--email",
        default="test@example.com",
        help="Email to use for testing (default: test@example.com)",
    )
    parser.add_argument(
        "--password",
        default="SuperSecretPassword123!",
        help="Master password to use for testing (or current password for change-password).",
    )
    parser.add_argument(
        "--new-password",
        default="EvenMoreSecretPassword456!",
        help="New master password to use when action is change-password.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Base API URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--post-vault",
        action="store_true",
        help="(For vault-* actions) Create two sample vault items.",
    )
    parser.add_argument(
        "--get-vault",
        action="store_true",
        help="(For vault-* actions) Fetch vault items.",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    register_url = f"{base_url}/auth/register"
    login_url = f"{base_url}/auth/login"
    change_url = f"{base_url}/auth/change-password"
    vault_items_url = f"{base_url}/vault/items"

    print(f"[*] Using base URL: {base_url}")
    print(f"    Register URL: {register_url}")
    print(f"    Login URL   : {login_url}")
    print(f"    Change URL  : {change_url}")
    print(f"    Vault URL   : {vault_items_url}")

    session = requests.Session()

    if args.action in ("register", "both"):
        register(session, register_url, args.email, args.password)
    elif args.action in ("login", "both"):
        login(session, login_url, args.email, args.password)
    elif args.action in ("vault-post", "vault-get", "vault-both"):
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot run vault operations.")
            return

        if args.post_vault or args.get_vault:
            do_post = bool(args.post_vault)
            do_get = bool(args.get_vault)
        else:
            if args.action == "vault-post":
                do_post, do_get = True, False
            elif args.action == "vault-get":
                do_post, do_get = False, True
            else:
                do_post, do_get = True, True

        test_vault(session, base_url, do_post=do_post, do_get=do_get)
    elif args.action == "change-password":
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot change password.")
            return

        change_password_and_rotate(session=session, change_url=change_url, vault_get_url=vault_items_url,
                                   current_password=args.password, new_password=args.new_password)


if __name__ == "__main__":
    main()