from fastapi import APIRouter, HTTPException, Depends
import httpx

from app.core.deps import get_current_user
from app.schemas.leaks import EmailLeakCheckRequest
from app.services.leaks import LeakCheckerService

router = APIRouter()


@router.post("/email/check", response_model=bool)
async def check_email_leaks(payload: EmailLeakCheckRequest, _=Depends(get_current_user)) -> bool:
    """
    Check if the given email appears in known data breaches using
    LeakCheckerService service.

    - Request body: {"email": "user@example.com"}
    - Response body: true / false (JSON boolean)

    Args:
        payload: Request body containing the email to be checked.
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
