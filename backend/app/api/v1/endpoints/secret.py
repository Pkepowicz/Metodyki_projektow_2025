from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.deps import get_current_user
from app.db.base import get_db
from app.schemas.secret import SecretCreate, SecretResponse, SecretAccessResponse
from app.crud import secret as crud_secret
from app.db.models import User

router = APIRouter()


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





# Public endpoints (no authentication required) for accessing shared secrets


@router.get("/access/{token}", response_model=SecretAccessResponse)
def access_secret_by_token(
    token: str,
    password: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Access a shared secret using its unique token and optional password.

    This endpoint is public (no authentication required). Anyone with the token can access the secret.
    Each access consumes one "access count". When the count reaches 0 or the secret expires,
    it becomes inaccessible.

    Args:
        token: The unique secret token from the shareable link.
        password: Optional password if the secret is password-protected.

    Returns:
        SecretAccessResponse: The secret content and remaining access info.

    Raises:
        HTTPException 404: If the secret token doesn't exist.
        HTTPException 401: If password is required but incorrect.
        HTTPException 410: If the secret has expired, been revoked, or has no remaining accesses.
    """
    db_secret = crud_secret.get_secret_by_token(db=db, token=token)
    
    if not db_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found"
        )
    
    # Check if expired
    if datetime.utcnow() > db_secret.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has expired"
        )
    
    # Check if revoked
    if db_secret.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has been revoked"
        )
    
    # Check if accesses exhausted
    if db_secret.remaining_accesses <= 0:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This secret has been accessed the maximum number of times"
        )
    
    # Verify password if required
    if not crud_secret.verify_secret_password(db_secret, password or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    # Capture content and expiry before consuming access so we can return them
    content = db_secret.content
    expires_at = db_secret.expires_at

    # Attempt to access and consume one count. This returns remaining accesses
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

