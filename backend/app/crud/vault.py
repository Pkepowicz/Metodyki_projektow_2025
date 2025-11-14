from sqlalchemy.orm import Session
from app.db import models
from app.schemas.vault import VaultItemCreate


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
