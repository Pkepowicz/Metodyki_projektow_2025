from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.base import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserLogin, ChangePasswordAndRotatePayload, ProtectedVaultKey
from app.schemas.token import Token, RefreshRequest
from app.crud import user as crud_user, vault as crud_vault
from app.crud import refresh_token as crud_refresh_token
from app.core.security import verify_password, create_access_token, generate_refresh_token
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> Response:
    """
    This endpoint accepts user registration data, derives the server-side FinalHash by hashing the provided AuthHash,
    and stores the user in the database.

    Args:
        user (UserCreate): Incoming registration payload containing email,
            AuthHash, ProtectedVaultKey, IV.
        db (Session): SQLAlchemy database session provided by dependency injection.

    Raises:
        HTTPException: If the email is already registered.

    Returns:
       Response: An empty response with HTTP 201 CREATED status on success.
    """
    db_user = crud_user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    crud_user.create_user(db=db, user=user)
    return Response(status_code=status.HTTP_201_CREATED)


@router.post("/login", response_model=Token)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    """
    This endpoint receives the client's AuthHash, verifies it against the stored
    FinalHash, and returns a signed JWT access token if authentication succeeds.

    Args:
        user (UserLogin): Login payload containing email and AuthHash.
        db (Session): SQLAlchemy database session provided by dependency injection.

    Raises:
        HTTPException: If the email does not exist or the AuthHash validation fails.

    Returns:
        Token: A JWT access token and token type ("bearer").
    """
    db_user = crud_user.get_user_by_email(db, email=user.email)

    if not db_user or not verify_password(user.auth_hash, db_user.hashed_auth_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password",
                            headers={"WWW-Authenticate": "Bearer"})

    access_token = create_access_token(data={"sub": db_user.email})

    raw_refresh_token = generate_refresh_token()
    crud_refresh_token.create_refresh_token(db, db_user, raw_refresh_token)

    return {"access_token": access_token, "token_type": "bearer", "refresh_token": raw_refresh_token}


@router.post("/refresh", response_model=Token)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)) -> Token:
    """
    Exchange a refresh token for a new access token and a rotated refresh token.

    Raises:
        HTTPException: With Status 401 if the token does not exist or is expired
        HTTPException: With Status 500 on database error

    Returns:
        Response: New JWT access token along with a new refresh token.
    """
    token_record = crud_refresh_token.get_valid_refresh_token(db, payload.refresh_token)
    if token_record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = token_record.user

    try:
        crud_refresh_token.delete_refresh_token(db, token_record)

        new_access_token = create_access_token({'sub': user.email})
        new_raw_refresh_token = generate_refresh_token()
        crud_refresh_token.create_refresh_token(db, user, new_raw_refresh_token)

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Could not refresh token. Please try again.')

    return Token(access_token=new_access_token, token_type='bearer',  refresh_token=new_raw_refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)) -> Response:
    """
    Logout by deleting the refresh token record (even if the token is expired).
    Returns 204 even if token is missing/invalid/expired.
    """
    try:
        token_record = crud_refresh_token.get_refresh_token(db, payload.refresh_token)
        if token_record is not None:
            crud_refresh_token.delete_refresh_token(db, token_record)
            db.commit()
    except Exception as exc:
        db.rollback()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password_and_rotate(payload: ChangePasswordAndRotatePayload, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)) -> Response:
    """
    Atomically change the user's current hashed password and rotate all vault items.

    The client's current AuthHash is verified against the stored FinalHash
    (hashed_auth_hash). If validation succeeds, the server updates the stored
    FinalHash, protected vault key, the encrypted_password, and site for
    the provided vault items that belong to the authenticated user.

    Args:
        payload (ChangePasswordAndRotatePayload): Payload containing the current
            AuthHash, new AuthHash, new protected vault key (and IV), and a list
            of re-encrypted vault items.
        db (Session): SQLAlchemy database session provided by dependency injection.
        current_user (User): The authenticated user, resolved from the JWT access
            token by the get_current_user dependency.

    Raises:
        HTTPException: With Status 401 if authentication via JWT fails.
        HTTPException: With Status 403 if the current AuthHash is incorrect or
            if any provided vault item is not owned by the authenticated user.
        HTTPException: With status 500 if a database error occurs while updating
            the user or vault items - the transaction is rolled back.
    """
    if not verify_password(payload.current_auth_hash, current_user.hashed_auth_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Current password is incorrect')

    for item in payload.items:
        if item.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f'Vault item {item.id} does not belong to the authenticated user')

    try:
        crud_user.update_user_auth(db=db, user=current_user, new_auth_hash=payload.new_auth_hash,
                                   new_protected_vault_key=payload.new_protected_vault_key,
                                   new_protected_vault_key_iv=payload.new_protected_vault_key_iv)
        crud_vault.bulk_rotate_vault_items_inplace(db=db, owner_id=current_user.id, rotated_items=payload.items)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail='Failed to change password and rotate vault items') from exc


@router.get("/vault-key", response_model=ProtectedVaultKey)
def get_protected_vault_key_material(current_user: User = Depends(get_current_user)) -> ProtectedVaultKey:
    """
    Return the authenticated user's protected vault key and IV.

    Uses the JWT-based authentication (get_current_user) to ensure that the caller is authorized and then exposes
    the encrypted vault key material, which the client can decrypt locally.
    """
    return ProtectedVaultKey(protected_vault_key=current_user.protected_vault_key,
                             protected_vault_key_iv=current_user.protected_vault_key_iv)
