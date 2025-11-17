from pydantic import BaseModel


class VaultItemBase(BaseModel):
    site: str
    encrypted_password: str

class VaultItemCreate(VaultItemBase):
    ...

class VaultItem(VaultItemBase):
    id: int
    owner_id: int

    class Config:
        # Enables compatibility with ORMs (e.g., SQLAlchemy) by allowing Pydantic models to read data from ORM objects
        orm_mode = True
