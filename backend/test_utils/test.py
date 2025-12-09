"""
Simple test client for FastAPI backend.

Supports:
    - user registration
    - user login
    - vault operations (POST/GET/PUT/DELETE)
    - password change with vault rotation
    - email leak check
    - password leak check (via SHA-1 hash)
    - fetching protected vault key (protected_vault_key + protected_vault_key_iv)
    - secrets sharing (create, access, list, revoke)

Usage examples:
    # Auth operations
    python test.py register
    python test.py login
    python test.py both
    python test.py change-password --new-password "NewPass123!"
    
    # Vault operations
    python test.py vault-post
    python test.py vault-get
    python test.py vault-both
    python test.py vault-put
    python test.py vault-delete
    python test.py vault-key
    
    # Secrets sharing
    python test.py secret-create --secret-content "My secret message" --max-access 3 --expires 3600
    python test.py secret-create --secret-content "Protected secret" --secret-password "pass123" --max-access 2
    python test.py secret-list
    python test.py secret-access --token <token>
    python test.py secret-access --token <token> --secret-password "pass123"
    python test.py secret-revoke --secret-id <id>
    
    # Leak checks
    python test.py leaks-email
    python test.py leaks-email --check-email other@example.com
    python test.py leaks-password
    python test.py leaks-password --check-password SomePassword123!
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
    payload = {"password": password_sha1}

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

def create_secret(session: requests.Session, secrets_url: str, content: str, max_accesses: int, expires_in_seconds: int, password: Optional[str] = None) -> Optional[str]:
    """Test helper: creates a new secret and returns the token.
    
    Args:
        session: requests session with Authorization header set.
        secrets_url: Base URL for secrets endpoint (e.g., http://localhost:8000/api/v1/secrets)
        content: The secret message content.
        max_accesses: Maximum number of times the secret can be accessed.
        expires_in_seconds: How long until the secret expires.
        password: Optional password to protect the secret.
    
    Returns:
        The secret token if successful, None otherwise.
    """
    payload = {
        "content": content,
        "max_accesses": max_accesses,
        "expires_in_seconds": expires_in_seconds,
    }
    if password:
        payload["password"] = password
    
    print(f"\n[*] Creating secret (max {max_accesses} accesses, expires in {expires_in_seconds}s) …")
    resp = session.post(f"{secrets_url}/", json=payload)
    print(f"[+] POST {secrets_url}/ -> {resp.status_code}")
    
    try:
        data = resp.json()
        print("[+] Response:", data)
        token = data.get("token")
        return token
    except Exception:
        print("[!] No JSON response or failed to create secret")
        return None


def list_secrets(session: requests.Session, secrets_url: str) -> None:
    """Test helper: lists all secrets created by authenticated user."""
    print(f"\n[*] Fetching user's secrets …")
    resp = session.get(f"{secrets_url}/")
    print(f"[+] GET {secrets_url}/ -> {resp.status_code}")
    
    try:
        secrets_list = resp.json()
        print(f"[+] Found {len(secrets_list)} secret(s):")
        for secret in secrets_list:
            print(f"    ID: {secret['id']}, Token: {secret['token'][:16]}..., "
                  f"Remaining: {secret['remaining_accesses']}/{secret['max_accesses']}, "
                  f"Revoked: {secret['is_revoked']}")
    except Exception as e:
        print(f"[!] Failed to list secrets: {e}")


def access_secret(session: requests.Session, base_url: str, token: str, password: Optional[str] = None) -> Optional[str]:
    """Test helper: accesses a secret by token (public endpoint, no auth needed).
    
    Args:
        session: requests session (auth not required for this endpoint).
        base_url: Base URL for secrets endpoint.
        token: The secret's unique token.
        password: Optional password if the secret is password-protected.
    
    Returns:
        The secret content if successful, None otherwise.
    """
    print(f"[*] Accessing secret with token: {token[:16]}…")
    params = {}
    if password:
        params["password"] = password
    # Accessing a secret is a GET operation (public link retrieval)
    resp = session.get(f"{base_url}/access/{token}", params=params)
    print(f"[+] GET {base_url}/access/{token} -> {resp.status_code}")
    
    try:
        data = resp.json()
        print(f"[+] Secret content: {data.get('content')}")
        print(f"[+] Remaining accesses: {data.get('remaining_accesses')}")
        print(f"[+] Expires at: {data.get('expires_at')}")
        return data.get("content")
    except Exception as e:
        print(f"[!] Failed to access secret: {e}")
        return None



def revoke_secret(session: requests.Session, secrets_url: str, secret_id: int) -> None:
    """Test helper: revokes a secret owned by the user."""
    print(f"\n[*] Revoking secret id={secret_id} …")
    resp = session.post(f"{secrets_url}/{secret_id}/revoke")
    print(f"[+] POST {secrets_url}/{secret_id}/revoke -> {resp.status_code}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action",
        choices=["register", "login", "both", "vault-post", "vault-get", "vault-both", "vault-put", "vault-delete",
                 "vault-key", "secret-create", "secret-list", "secret-access", "secret-revoke",
                 "change-password", "leaks-email", "leaks-password"],
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
    parser.add_argument(
        "--secret-content",
        default="This is a test secret message!",
        help="(For secret-create) The secret content to share.",
    )
    parser.add_argument(
        "--max-access",
        type=int,
        default=3,
        help="(For secret-create) Maximum number of accesses (default: 3).",
    )
    parser.add_argument(
        "--expires",
        type=int,
        default=3600,
        help="(For secret-create) Expiration time in seconds (default: 3600 = 1 hour).",
    )
    parser.add_argument(
        "--token",
        default=None,
        help="(For secret-access) The secret token to access.",
    )
    parser.add_argument(
        "--secret-password",
        default=None,
        help="(For secret-create/secret-access) Optional password for secret protection/access.",
    )
    parser.add_argument(
        "--secret-id",
        type=int,
        default=None,
        help="(For secret-revoke) The secret ID to revoke.",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    register_url = f"{base_url}/auth/register"
    login_url = f"{base_url}/auth/login"
    change_url = f"{base_url}/auth/change-password"
    vault_items_url = f"{base_url}/vault/items"
    secrets_url = f"{base_url}/secrets"

    print(f"[*] Using base URL: {base_url}")
    print(f"    Register URL: {register_url}")
    print(f"    Login URL   : {login_url}")
    print(f"    Change URL  : {change_url}")
    print(f"    Vault URL   : {vault_items_url}")
    print(f"    Secrets URL : {secrets_url}")

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
    elif args.action in ("secret-create", "secret-list", "secret-access", "secret-status", "secret-revoke"):
        if args.action != "secret-access" and args.action != "secret-status":
            # These require authentication
            token = login(session, login_url, args.email, args.password)
            if not token:
                print("[!] No access token obtained; cannot run secret operations.")
                return
        
        if args.action == "secret-create":
            create_secret(session, secrets_url, args.secret_content, args.max_access, args.expires, args.secret_password)
        elif args.action == "secret-list":
            list_secrets(session, secrets_url)
        elif args.action == "secret-access":
            if not args.token:
                print("[!] --token is required for secret-access")
                return
            access_secret(session, secrets_url, args.token, args.secret_password)
        elif args.action == "secret-revoke":
            if args.secret_id is None:
                print("[!] --secret-id is required for secret-revoke")
                return
            revoke_secret(session, secrets_url, args.secret_id)
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
