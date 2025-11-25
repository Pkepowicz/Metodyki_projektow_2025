from fastapi import APIRouter, HTTPException, Depends
import httpx

from app.core.deps import get_current_user
from app.schemas.leaks import EmailLeakCheckRequest, PasswordHashLeakCheckRequest
from app.services.leaks import LeakCheckerService

router = APIRouter()


@router.post("/email/check", response_model=bool)
async def check_email_leaks(payload: EmailLeakCheckRequest, _=Depends(get_current_user)) -> bool:
    """
    Check if the given email appears in known data breaches using LeakCheckerService service.

    Args:
        payload: ({"email": "user@example.com"})
            Request body containing the email to be checked.
        _: Unused; ensures the user is authenticated via get_current_user dependency.

    Raises:
        HTTPException: If all leak-check providers are unavailable.

    Returns:
        bool: True if the email appears in any known data breaches, otherwise False.
    """
    email = payload.email
    async with httpx.AsyncClient() as client:
        service = LeakCheckerService(client)
        providers_available, leaked = await service.check_email_leaks(email=email)

    if not providers_available:
        raise HTTPException(status_code=503, detail='Leak-check providers are unavailable',)

    return leaked

@router.post("/password/check", response_model=bool)
async def check_password_hash_leaks(payload: PasswordHashLeakCheckRequest, _=Depends(get_current_user)) -> bool:
    """
    Check if the given SHA-1 password hash appears in known data breaches using LeakCheckerService service.

    Args:
        payload: ({"password_sha1": "<40-char SHA-1 hex>"})
            Request body containing the SHA-1 password hash to be checked.
        _: Unused; ensures the user is authenticated via get_current_user dependency.

    Raises:
        HTTPException:
            - 400 if the provided hash is invalid.
            - 503 if the Pwned Passwords provider is unavailable.

    Returns:
        bool: True if the password hash appears in any known dataset, otherwise False.
    """
    async with httpx.AsyncClient() as client:
        service = LeakCheckerService(client)
        try:
            provider_available, leaked = await service.check_password_hash_leaks(password_sha1=payload.password_sha1)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not provider_available:
        raise HTTPException(status_code=503, detail='Leak-check provider is unavailable')

    return leaked
