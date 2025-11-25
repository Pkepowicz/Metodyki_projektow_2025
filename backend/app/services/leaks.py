import asyncio
from typing import Tuple
import httpx

from app.core.config import settings


class LeakCheckerService:
    """
    Service for checking whether an email address appears in known data breaches
    using external leak-check providers (XposedOrNot, LeakCheck).
    """

    def __init__(self, client: httpx.AsyncClient) -> None:
        """
        Initialize the leak checker service.

        Args:
            client: Shared async HTTP client used for all provider calls.
        """
        self.client = client

    async def _check_xposedornot(self, email: str) -> Tuple[bool, bool]:
        """
        Check XposedOrNot for the given email.

        Args:
            email: Email address to be checked.

        Returns:
            Tuple[bool, bool]: A tuple (provider_available, leaked) where:
                - provider_available is True if XposedOrNot responded successfully.
                - leaked is True if the email was found in any breaches.
        """
        url = f'{settings.XPOSEDORNOT_API_URL}/check-email/{email}'

        try:
            resp = await self.client.get(url, timeout=settings.XPOSEDORNOT_TIMEOUT_SECONDS)
        except httpx.RequestError:
            return False, False

        if resp.status_code != 200:
            return False, False

        data = resp.json()
        # No breach: {"Error": "Not found"}
        if isinstance(data, dict) and data.get('Error') == 'Not found':
            return True, False

        breaches = data.get('breaches') if isinstance(data, dict) else None
        leaked = bool(breaches)
        return True, leaked

    async def _check_leakcheck(self, email: str) -> Tuple[bool, bool]:
        """
        Check LeakCheck public API for the given email.

        Args:
            email: Email address to be checked.

        Returns:
            Tuple[bool, bool]: A tuple (provider_available, leaked) where:
                - provider_available is True if LeakCheck responded successfully.
                - leaked is True if the email was found in any leaks.
        """
        url, params = settings.LEAKCHECK_API_URL, {"check": email}

        try:
            resp = await self.client.get(url, params=params, timeout=settings.LEAKCHECK_TIMEOUT_SECONDS)
        except httpx.RequestError:
            return False, False

        if resp.status_code != 200:
            return False, False

        data = resp.json()
        success, leaks_found = bool(data.get('success')), int(data.get('found', 0))

        if not success:
            return True, False

        leaked = leaks_found > 0
        return True, leaked

    async def check_email_leaks(self, email: str) -> Tuple[bool, bool]:
        """
        Check if the given email appears in known data breaches using
        all configured providers.

        Args:
            email: Email address to be checked.

        Returns:
            Tuple[bool, bool]: A tuple (any_provider_available, leaked) where:
                - any_provider_available is True if at least one provider
                  responded successfully.
                - leaked is True if any provider reports the email as leaked.
        """
        (xon_available, xon_leaked), (lc_available, lc_leaked) = await asyncio.gather(
            self._check_xposedornot(email),
            self._check_leakcheck(email),
        )

        any_provider_available = xon_available or lc_available
        leaked = xon_leaked or lc_leaked
        return any_provider_available, leaked
