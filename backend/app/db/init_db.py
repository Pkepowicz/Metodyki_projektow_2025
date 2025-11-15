from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.crud.user import get_user_by_email, create_user
from app.schemas.user import UserCreate


def init_db_with_fake_user() -> None:
    """
    This function is intended only for development and local testing!

    Initialize the database with a fake user if it doesn't exist yet.
    """
    db: Session = SessionLocal()
    try:
        fake_email = 'admin@admin.admin'
        user = get_user_by_email(db, email=fake_email)
        if user:
            return

        fake_user = UserCreate(email=fake_email,
                                auth_hash='179092fc8e6de44bbdf3e97b64be08cebf816ed30820c62e4fec6a496e6ebc98',
                                protected_vault_key='PWrld6WQCbBZcRhnRdh812jbQUQxqLf/BoYLB43FUNw=',
                                protected_vault_key_iv='rgL6PAeqPkT15v0Vo/vU9g==')
        create_user(db, fake_user)
    finally:
        db.close()
