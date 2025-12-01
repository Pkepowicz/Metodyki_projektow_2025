"""
Simple test client for FastAPI backend.

Supports:
    - user registration
    - user login
    - vault operations (POST/GET)
    - password change with vault rotation
    - email leak check
    - password leak check (via SHA-1 hash)
    - fetching protected vault key (protected_vault_key + protected_vault_key_iv)

Usage examples:
    python test.py register
    python test.py login
    python test.py both (register and login)
    python test.py vault-post
    python test.py vault-get
    python test.py vault-both
    python test.py change-password --new-password "NewPass123!"
    python test.py leaks-email
    python test.py leaks-password
    python test.py vault-key
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


def sha1_password(password: str) -> str:
    """
    Compute the SHA-1 hash (hex, upper-case) of a password string.

    Used for testing the /leaks/password/check endpoint, which expects the
    client to send a SHA-1 hash of the password.
    """
    return hashlib.sha1(password.encode("utf-8")).hexdigest().upper()


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


def login(session: requests.Session, login_url: str, email: str, master_password: str) -> Optional[str]:
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


def change_password_and_rotate(session: requests.Session, change_url: str, vault_get_url: str,
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


def test_email_leak(session: requests.Session, base_url: str, email_to_check: str) -> None:
    """
    Call POST /leaks/email/check with the given email and print the result.

    Assumes the session already has an Authorization header set.
    """
    url, payload = f"{base_url}/leaks/email/check", {"email": email_to_check}

    print(f"\n[*] Checking email leak for {email_to_check!r} …")
    resp = session.post(url, json=payload)
    print(f"[+] POST {url} -> {resp.status_code}")
    try:
        data = resp.json()
        print("[+] Response JSON:", data)
    except Exception:
        print("[+] Raw response text:", resp.text)


def test_password_leak(session: requests.Session, base_url: str, password_to_check: str) -> None:
    """
    Call POST /leaks/password/check with the SHA-1 of the given password
    and print the result.

    Assumes the session already has an Authorization header set.
    """
    url, password_sha1 = f"{base_url}/leaks/password/check", sha1_password(password_to_check)
    payload = {"password_sha1": password_sha1}

    print(f"\n[*] Checking password leak (SHA-1={password_sha1}) …")
    resp = session.post(url, json=payload)
    print(f"[+] POST {url} -> {resp.status_code}")
    try:
        data = resp.json()
        print("[+] Response JSON:", data)
    except Exception:
        print("[+] Raw response text:", resp.text)


def test_vault_key(session: requests.Session, base_url: str) -> None:
    """
    Call GET /auth/vault-key and print the result.

    Assumes the session already has an Authorization header set.
    """
    url = f"{base_url}/auth/vault-key"

    print("\n[*] Fetching protected vault key …")
    resp = session.get(url)
    print(f"[+] GET {url} -> {resp.status_code}")
    try:
        data = resp.json()
        print("[+] Response JSON:", data)
        key = data.get("protected_vault_key")
        iv = data.get("protected_vault_key_iv")
        if key and iv:
            print(f"[+] protected_vault_key: {key}")
            print(f"[+] protected_vault_key_iv: {iv}")
        else:
            print("[!] Missing expected fields in response.")
    except Exception:
        if resp.text:
            print("[+] Raw response text:", resp.text)
        else:
            print("[+] No response body.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=["register", "login", "both", "vault-post", "vault-get", "vault-both", "vault-put", "vault-delete",  "change-password",
                 "leaks-email", "leaks-password", "vault-key"],
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
    parser.add_argument(
        "--check-email",
        default=None,
        help="Email to check for leaks (defaults to --email if not provided).",
    )
    parser.add_argument(
        "--check-password",
        default=None,
        help="Password to check for leaks (defaults to --password if not provided).",
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
        if args.action == "both":
            # After registering, also log in
            login(session, login_url, args.email, args.password)
    elif args.action in ("login",):
        login(session, login_url, args.email, args.password)
    elif args.action in ("vault-post", "vault-get", "vault-both", "vault-delete", "vault-put"):
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

        if args.action == "vault-delete":
            # Fetch items and delete the first one (if any)
            get_url = f"{base_url}/vault/items"
            print("\n[*] Fetching vault items for deletion …")
            resp = session.get(get_url)
            print(f"[+] GET {get_url} -> {resp.status_code}")
            try:
                items = resp.json()
            except Exception:
                print("[!] Could not parse vault items JSON; aborting deletion.")
                return

            if not items:
                print("[!] No items to delete")
                return

            item_to_delete = items[0]
            delete_url = f"{get_url}/{item_to_delete['id']}"
            print(f"\n[*] Deleting item id={item_to_delete['id']} …")
            resp = session.delete(delete_url)
            print(f"[+] DELETE {delete_url} -> {resp.status_code}")
        elif args.action == "vault-put":
            # Fetch items and update the first one
            get_url = f"{base_url}/vault/items"
            print("\n[*] Fetching vault items for update …")
            resp = session.get(get_url)
            print(f"[+] GET {get_url} -> {resp.status_code}")
            try:
                items = resp.json()
            except Exception:
                print("[!] Could not parse vault items JSON; aborting update.")
                return

            if not items:
                print("[!] No items to update")
                return

            item_to_update = items[0]
            update_url = f"{get_url}/{item_to_update['id']}"
            new_payload = {"site": item_to_update['site'] + "-updated", "encrypted_password": generate_fake_ciphertext()}
            print(f"\n[*] Updating item id={item_to_update['id']} …")
            resp = session.put(update_url, json=new_payload)
            print(f"[+] PUT {update_url} -> {resp.status_code}")
            try:
                print("[+] Response JSON:", resp.json())
            except Exception:
                print("[+] No JSON response")
        else:
            test_vault(session, base_url, do_post=do_post, do_get=do_get)
    elif args.action == "change-password":
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot change password.")
            return

        change_password_and_rotate(session=session, change_url=change_url, vault_get_url=vault_items_url,
                                   current_password=args.password, new_password=args.new_password)
    elif args.action == "leaks-email":
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot run email leak check.")
            return

        email_to_check = args.check_email or args.email
        test_email_leak(session, base_url, email_to_check)
    elif args.action == "leaks-password":
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot run password leak check.")
            return

        password_to_check = args.check_password or args.password
        test_password_leak(session, base_url, password_to_check)
    elif args.action == "vault-key":
        token = login(session, login_url, args.email, args.password)
        if not token:
            print("[!] No access token obtained; cannot fetch vault key.")
            return

        test_vault_key(session, base_url)


if __name__ == "__main__":
    main()
