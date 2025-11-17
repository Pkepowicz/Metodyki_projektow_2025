from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.schemas.vault import VaultItem as VaultItemSchema, VaultItemCreate
from app.crud import vault as crud_vault
from app.db.models import User

router = APIRouter()


@router.get("/items", response_model=List[VaultItemSchema])
def list_vault_items(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all vault items belonging to the authenticated user.

    This endpoint is protected — the request must include a valid JWT access token
    in the `Authorization: Bearer <token>` header. It returns only items owned
    by the authenticated user to ensure user separation.

    Args:
        current_user (User): The authenticated user provided by the `get_current_user` dependency.
        db (Session): Database session provided by dependency injection.

    Returns:
        List[VaultItem]: A list of the user's vault items (each item includes `id`, `owner_id`, `site`, and `encrypted_password`).
    """
    return crud_vault.get_items_for_user(db=db, user_id=current_user.id)


@router.post("/items", response_model=VaultItemSchema, status_code=status.HTTP_201_CREATED)
def create_vault_item(
    item: VaultItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Create a new vault item for the authenticated user.

    The request body must match the `VaultItemCreate` schema (fields: `site`, `encrypted_password`).
    The created record will be associated with the currently authenticated user.

    Args:
        item (VaultItemCreate): The vault item payload to store (encrypted_password + site).
        current_user (User): The authenticated user provided by the `get_current_user` dependency.
        db (Session): Database session provided by dependency injection.

    Returns:
        VaultItem: The newly created vault item including `id` and `owner_id`.
    """
    return crud_vault.create_item_for_user(db=db, user_id=current_user.id, item=item)
