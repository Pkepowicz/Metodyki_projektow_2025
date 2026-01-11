"""
Maintenance script for cleaning up expired refresh tokens and secrets.
This module is intended to be run as a standalone script, e.g. python -m app.maintenance.cleanup_db

It opens a database session, deletes all refresh tokens and secrets whose expiry time has passed,
commits the transaction, and logs how many rows were removed.
"""

from app.db.base import get_db
from app.crud import refresh_token as crud_refresh_token
from app.crud import secret as crud_secret


def main() -> None:
    with get_db() as db:
        try:
            deleted_tokens = crud_refresh_token.delete_expired_refresh_tokens(db)
            deleted_secrets = crud_secret.delete_expired_secrets(db)
            db.commit()
            print(f'Deleted {deleted_tokens} expired refresh tokens.')
            print(f'Deleted {deleted_secrets} expired secrets.')
        except Exception as exc:
            db.rollback()
            print(f'Error while deleting expired data: {exc}')


if __name__ == '__main__':
    main()
