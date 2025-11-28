from typing import List

from fastapi import APIRouter, Depends, status, HTTPException, Response
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


@router.delete("/items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vault_item(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a vault item owned by the authenticated user.

    If the item does not exist, return 404. If it belongs to another user, return 403.
    On success, the endpoint returns HTTP 204 NO CONTENT with an empty response body.
    """
    db_item = crud_vault.get_item(db=db, item_id=id)
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault item not found")

    if db_item.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Vault item does not belong to the authenticated user')

    crud_vault.delete_item(db=db, db_item=db_item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/items/{id}", response_model=VaultItemSchema)
def update_vault_item(
    id: int, item: VaultItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Update a vault item owned by the authenticated user.

    If the item does not exist, return 404. If it belongs to another user, return 403.
    On success, the endpoint returns the updated `VaultItem` (200) with the new data.
    """
    db_item = crud_vault.get_item(db=db, item_id=id)
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault item not found")

    if db_item.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Vault item does not belong to the authenticated user')

    updated = crud_vault.update_item(db=db, db_item=db_item, item=item)
    return updated
