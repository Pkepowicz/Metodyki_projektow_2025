from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.user import UserCreate, UserLogin
from app.schemas.token import Token
from app.crud import user as crud_user
from app.core.security import verify_password, create_access_token

router = APIRouter()


@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> Response:
    """
    This endpoint accepts user registration data, derives the server-side FinalHash by hashing the provided AuthHash,
    and stores the user in the database.

    Args:
        user (UserCreate): Incoming registration payload containing email,
            AuthHash, ProtectedVaultKey, and KDF iteration count.
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
def login_for_access_token(user: UserLogin, db: Session = Depends(get_db)):
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
    return {"access_token": access_token, "token_type": "bearer"}
