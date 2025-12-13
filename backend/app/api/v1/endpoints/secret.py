from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.deps import get_current_user
from app.db.base import get_db
from app.schemas.secret import SecretCreate, SecretResponse, SecretAccessResponse
from app.crud import secret as crud_secret
from app.db.models import User

router = APIRouter()
public_router = APIRouter()


# Public endpoints (no authentication required) for accessing shared secrets


@public_router.get("/{token}", response_class=HTMLResponse)
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
        HTML: An HTML page displaying the secret content, remaining accesses, and expiration time.
              If password-protected and no/wrong password provided, returns a password input form.
    """
    db_secret = crud_secret.get_secret_by_token(db=db, token=token)
    
    if not db_secret:
        return HTMLResponse(
            content="<html><head><title>Not Found</title></head><body><h1>404 - Secret Not Found</h1><p>This secret does not exist.</p></body></html>",
            status_code=404
        )
    
    if datetime.utcnow() > db_secret.expires_at:
        return HTMLResponse(
            content="<html><head><title>Expired</title></head><body><h1>410 - Secret Expired</h1><p>This secret has expired and is no longer accessible.</p></body></html>",
            status_code=410
        )
    
    if db_secret.is_revoked:
        return HTMLResponse(
            content="<html><head><title>Revoked</title></head><body><h1>410 - Secret Revoked</h1><p>This secret has been revoked by its owner.</p></body></html>",
            status_code=410
        )
    
    if db_secret.remaining_accesses <= 0:
        return HTMLResponse(
            content="<html><head><title>Access Limit Reached</title></head><body><h1>410 - Maximum Access Count Reached</h1><p>This secret has been accessed the maximum number of times.</p></body></html>",
            status_code=410
        )

    secret_requires_password = db_secret.password_hash is not None
    
    if secret_requires_password:
        return HTMLResponse(
            content="""
            <html>
                <head>
                    <title>Password Protected Secret</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            padding: 20px;
                        }
                        .container {
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                            padding: 40px;
                            max-width: 450px;
                            width: 100%;
                            text-align: center;
                        }
                        h1 {
                            color: #333;
                            margin-bottom: 10px;
                            font-size: 28px;
                        }
                        .icon {
                            font-size: 48px;
                            margin-bottom: 20px;
                        }
                        p {
                            color: #666;
                            margin-bottom: 20px;
                            line-height: 1.6;
                        }
                        .note {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 15px;
                            margin-top: 20px;
                            text-align: left;
                            color: #856404;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">🔒</div>
                        <h1>Password Protected Secret</h1>
                        <p>This secret is password protected.</p>
                        <div class="note">
                            <strong>Note:</strong> Password-protected secrets are not yet supported for browser access. 
                            Please use the API endpoint with the <code>format=json</code> parameter to access this secret programmatically.
                        </div>
                    </div>
                </body>
            </html>
            """,
            status_code=403
        )

    content = db_secret.content
    expires_at = db_secret.expires_at

    remaining = crud_secret.access_secret(db=db, secret=db_secret)
    if remaining < 0:
        return HTMLResponse(
            content="<html><head><title>No Longer Accessible</title></head><body><h1>410 - Secret No Longer Accessible</h1><p>This secret cannot be accessed anymore.</p></body></html>",
            status_code=410
        )

    return HTMLResponse(content=f"""
    <html>
        <head>
            <title>Secret Revealed</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                }}
                h1 {{
                    color: #333;
                    margin-bottom: 30px;
                    font-size: 32px;
                    text-align: center;
                }}
                .success-icon {{
                    text-align: center;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                .content-box {{
                    background: #f5f5f5;
                    border-left: 4px solid #4caf50;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    word-break: break-word;
                    white-space: pre-wrap;
                    font-family: 'Monaco', 'Courier New', monospace;
                    line-height: 1.6;
                }}
                .metadata {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                }}
                .metadata-item {{
                    text-align: center;
                }}
                .metadata-label {{
                    color: #999;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }}
                .metadata-value {{
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                }}
                .warning {{
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #856404;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Secret Content</h1>
                <div class="content-box">{content}</div>
                <div class="metadata">
                    <div class="metadata-item">
                        <div class="metadata-label">Remaining Accesses</div>
                        <div class="metadata-value">{remaining}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">Expires At</div>
                        <div class="metadata-value">{expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
                    </div>
                </div>
                {f'<div class="warning">⚠️ This secret will expire soon. Make note of the content above.</div>' if remaining == 1 else ''}
            </div>
        </body>
    </html>
    """)


# Authenticated endpoints for managing secrets


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