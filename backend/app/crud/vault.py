from typing import Iterable
from sqlalchemy.orm import Session
from app.db import models
from app.schemas.vault import VaultItemCreate, VaultItem


def get_items_for_user(db: Session, user_id: int):
    """Return all vault items for a given user."""
    return db.query(models.VaultItem).filter(models.VaultItem.owner_id == user_id).all()


def create_item_for_user(db: Session, user_id: int, item: VaultItemCreate):
    """Create a new vault item owned by `user_id`."""
    db_item = models.VaultItem(owner_id=user_id, site=item.site, encrypted_password=item.encrypted_password)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def bulk_rotate_vault_items_inplace(db: Session, owner_id: int, rotated_items: Iterable[VaultItem]) -> None:
    """
    Overwrite encrypted_password and site for multiple vault items owned by a user.
    IMPORTANT: Does NOT commit. Caller must commit/rollback.
    """
    items_by_id = {item.id: item for item in rotated_items}
    if not items_by_id:
        return

    db_items = (db.query(models.VaultItem).filter(models.VaultItem.owner_id == owner_id,
                                                  models.VaultItem.id.in_(items_by_id.keys())).all())

    for db_item in db_items:
        payload_item = items_by_id.get(db_item.id)
        if not payload_item:
            continue

        db_item.site = payload_item.site
        db_item.encrypted_password = payload_item.encrypted_password
        db.add(db_item)


def get_item(db: Session, item_id: int):
    """Return a single vault item by id (or None if not found)."""
    return db.query(models.VaultItem).filter(models.VaultItem.id == item_id).first()


def delete_item(db: Session, db_item: models.VaultItem):
    """Delete a vault item instance and commit the transaction.

    Returns the deleted item for convenience.
    """
    db.delete(db_item)
    db.commit()
    return db_item


def update_item(db: Session, db_item: models.VaultItem, item: VaultItemCreate):
    """Update fields of a vault item and persist to the database.

    Returns the updated item.
    """
    db_item.site = item.site
    db_item.encrypted_password = item.encrypted_password
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
