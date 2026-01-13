from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.schemas.secret import SecretCreate, SecretResponse, SecretAccessResponse
from app.crud import secret as crud_secret
from app.db.models import User

router = APIRouter()
public_router = APIRouter()

APP_DIR = Path(__file__).resolve()
while APP_DIR.name != "app":
    APP_DIR = APP_DIR.parent

templates = Jinja2Templates(directory=str(APP_DIR / "templates"))


@public_router.get("/{token}", response_class=HTMLResponse)
def access_secret_by_token(token: str, request: Request, db: Session = Depends(get_db)):
    """Access a shared secret using its unique token and optional password.

    This endpoint is public (no authentication required). Anyone with the token can access the secret.
    Each access consumes one "access count". When the count reaches 0 or the secret expires,
    it becomes inaccessible.

    Args:
        token: The unique secret token from the shareable link.

    Returns:
        HTML: An HTML page displaying the secret content, remaining accesses, and expiration time.
              If password-protected and no/wrong password provided, returns a password input form.
    """
    db_secret = crud_secret.get_secret_by_token(db=db, token=token)

    if not db_secret:
        return templates.TemplateResponse("secret.html",
                                          {"request": request, "state": "not_found", "title": "Not Found"},
                                          status_code=404)

    if datetime.utcnow() > db_secret.expires_at:
        return templates.TemplateResponse("secret.html", {"request": request, "state": "expired", "title": "Expired"},
                                          status_code=410)

    if db_secret.is_revoked:
        return templates.TemplateResponse("secret.html", {"request": request, "state": "revoked", "title": "Revoked"},
                                          status_code=410)

    if db_secret.remaining_accesses <= 0:
        return templates.TemplateResponse("secret.html",
                                          {"request": request, "state": "limit", "title": "Access Limit Reached"},
                                          status_code=410)

    if db_secret.remaining_accesses <= 0:
        return templates.TemplateResponse(
            "secret.html", {"request": request, "state": "limit", "title": "Access Limit Reached"}, status_code=410)

    if db_secret.password_hash is not None:
        return templates.TemplateResponse(
            "secret.html", {"request": request, "state": "password", "title": "Password Required", "error": None},
            status_code=200)

    remaining = crud_secret.access_secret(db=db, secret=db_secret)
    return templates.TemplateResponse(
        "secret.html",
        {
            "request": request,
            "state": "revealed",
            "title": "Secret Revealed",
            "content": db_secret.content,
            "remaining_accesses": remaining,
            "expires_at_str": db_secret.expires_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        },
        status_code=200,
    )


@public_router.post("/{token}", response_class=HTMLResponse)
def access_secret_by_token_post(token: str, request: Request, password: str = Form(...), db: Session = Depends(get_db)):
    """
    Verify the password and reveal the secret content via form submission.

    This endpoint handles the POST request from the password input form. It verifies
    the provided password (a SHA-256 hex string from the frontend) against the stored hash.
    If successful, it consumes one access and displays the secret.

    Args:
        token: The unique secret token from the shareable link.
        password: The password string provided via the HTML form.

    Returns:
         HTML: An HTML page displaying the secret content if the password is correct.
               If the password is invalid, returns the password form with an error message.
               If the secret is expired or gone, returns the corresponding error state.
        """
    db_secret = crud_secret.get_secret_by_token(db=db, token=token)

    if not db_secret or datetime.utcnow() > db_secret.expires_at or db_secret.is_revoked or db_secret.remaining_accesses <= 0:
         return templates.TemplateResponse(
             "secret.html", {"request": request, "state": "expired", "title": "Expired"}, status_code=410)

    if not crud_secret.verify_secret_password(db_secret, password):
        return templates.TemplateResponse(
            "secret.html",
            {
                "request": request, "state": "password", "title": "Invalid Password", "error": "Invalid password."
            },
            status_code=401
        )

    remaining = crud_secret.access_secret(db=db, secret=db_secret)
    return templates.TemplateResponse(
        "secret.html",
        {
            "request": request,
            "state": "revealed",
            "title": "Secret Revealed",
            "content": db_secret.content,
            "remaining_accesses": remaining,
            "expires_at_str": db_secret.expires_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        },
    )


@router.post("/", response_model=SecretResponse, status_code=status.HTTP_201_CREATED)
def create_secret(
    payload: SecretCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new shareable secret.

    The authenticated user becomes the owner of this secret.
    
    Request body fields:
        - content (str): The secret message to share.
        - max_accesses (int): Maximum number of times this secret can be accessed before deletion.
        - expires_in_seconds (int): How long until the secret expires (e.g., 3600 for 1 hour).
        - password (str, optional): Optional password to protect access to this secret.

    Returns:
        SecretResponse: The newly created secret including the shareable token.
        The token should be shared with recipients via a URL like: https://yourapp.com/secret/{token}
    """
    db_secret = crud_secret.create_secret(db=db, owner_id=current_user.id, secret=payload)
    return db_secret


@router.get("/", response_model=List[SecretResponse])
def list_user_secrets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all secrets created by the authenticated user.

    This endpoint allows creators to view all their secrets, their remaining access counts,
    and expiration times to manage what they've shared.

    Returns:
        List[SecretResponse]: All secrets owned by the authenticated user.
    """
    secrets = crud_secret.get_secrets_for_user(db=db, owner_id=current_user.id)
    return secrets


@router.post("/{secret_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_secret(
    secret_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a secret, making it inaccessible to anyone with the link.

    Only the creator can revoke their secret.

    Args:
        secret_id: The ID of the secret to revoke.

    Returns:
        HTTP 204 No Content on success.
    """
    db_secret = crud_secret.get_secret_by_id(db=db, secret_id=secret_id)
    
    if not db_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )
    
    if db_secret.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to revoke this secret"
        )
    
    crud_secret.revoke_secret(db=db, secret=db_secret)


# Public JSON endpoint for accessing secrets
@router.get("/access/{token}", response_model=SecretAccessResponse)
def access_secret_json(
    token: str,
    password: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Access a shared secret using its unique token and return JSON data.

    This endpoint is public (no authentication required). Anyone with the token can access the secret.
    Each access consumes one "access count". When the count reaches 0 or the secret expires,
    it becomes inaccessible.

    Args:
        token: The unique secret token from the shareable link.
        password: Optional password if the secret is password-protected.

    Returns:
        SecretAccessResponse: JSON with secret content, remaining accesses, and expiration time.

    Raises:
        HTTPException 404: If the secret token doesn't exist.
        HTTPException 401: If password is required but incorrect.
        HTTPException 403: If password-protected (not supported yet in JSON mode).
        HTTPException 410: If the secret has expired, been revoked, or has no remaining accesses.
    """
    db_secret = crud_secret.get_secret_by_token(db=db, token=token)
    
    if not db_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )

    if datetime.utcnow() > db_secret.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has expired"
        )
    
    if db_secret.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has been revoked"
        )
    
    if db_secret.remaining_accesses <= 0:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has been accessed the maximum number of times"
        )

    secret_requires_password = db_secret.password_hash is not None
    
    if secret_requires_password:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required"
            )
        
        if not crud_secret.verify_secret_password(db_secret, password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
    
    content = db_secret.content
    expires_at = db_secret.expires_at
    
    remaining = crud_secret.access_secret(db=db, secret=db_secret)
    if remaining < 0:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret is no longer accessible"
        )
    
    return {
        "content": content,
        "remaining_accesses": remaining,
        "expires_at": expires_at
    }