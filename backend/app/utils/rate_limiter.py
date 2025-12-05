from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Tuple
import threading


class SimpleRateLimiter:
    """
    Simple in-memory rate limiter
    For production, consider using Redis
    """

    def __init__(self):
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, identifier: str, max_requests: int, window_hours: int = 1) -> Tuple[bool, int]:
        """
        Check if request is allowed based on rate limit

        Args:
            identifier: Unique identifier (e.g., IP address or email)
            max_requests: Maximum requests allowed in window
            window_hours: Time window in hours

        Returns:
            Tuple[bool, int]: (is_allowed, remaining_requests)
        """
        with self._lock:
            now = datetime.utcnow()
            window_start = now - timedelta(hours=window_hours)

            # Get requests for this identifier
            requests = self._requests[identifier]

            # Remove old requests outside the window
            requests[:] = [req_time for req_time in requests if req_time > window_start]

            # Check if limit exceeded
            if len(requests) >= max_requests:
                return False, 0

            # Add current request
            requests.append(now)
            remaining = max_requests - len(requests)

            return True, remaining

    def cleanup_old_entries(self, hours: int = 24):
        """Remove entries older than specified hours"""
        with self._lock:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            for identifier in list(self._requests.keys()):
                self._requests[identifier][:] = [
                    req_time for req_time in self._requests[identifier]
                    if req_time > cutoff
                ]
                # Remove empty entries
                if not self._requests[identifier]:
                    del self._requests[identifier]


# Global rate limiter instance
contact_rate_limiter = SimpleRateLimiter()
