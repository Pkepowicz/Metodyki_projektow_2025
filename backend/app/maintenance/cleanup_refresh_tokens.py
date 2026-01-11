"""
Maintenance script for cleaning up expired refresh tokens.
This module is intended to be run as a standalone script, e.g. python -m app.maintenance.cleanup_refresh_tokens

It opens a database session, deletes all refresh tokens whose expiry time has passed,
commits the transaction, and logs how many rows were removed.
"""

from app.db.base import SessionLocal, get_db
from app.crud import refresh_token as crud_refresh_token


def main() -> None:
    db_gen = get_db()
    db = next(db_gen)
    try:
        deleted = crud_refresh_token.delete_expired_refresh_tokens(db)
        db.commit()
        print(f'Deleted {deleted} expired refresh tokens.')
    except Exception as exc:
        db.rollback()
        print(f'Error while deleting expired refresh tokens: {exc}')
    finally:
        db_gen.close()


if __name__ == '__main__':
    main()
