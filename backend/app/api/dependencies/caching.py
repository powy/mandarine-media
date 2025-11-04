from fastapi import Response
from typing import Optional


def set_cache_control(
    response: Response,
    max_age: int,
    s_maxage: Optional[int] = None,
    public: bool = True,
    must_revalidate: bool = False,
    no_store: bool = False,
    immutable: bool = False
) -> None:
    """
    Set Cache-Control header on FastAPI response.

    Args:
        response: FastAPI Response object
        max_age: Browser cache duration in seconds
        s_maxage: CDN cache duration in seconds (CloudFront, etc.)
        public: If True, allows caching by CDNs and proxies
        must_revalidate: If True, forces revalidation after max-age expires
        no_store: If True, prevents all caching
        immutable: If True, indicates content will never change
    """
    if no_store:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return

    parts = []
    parts.append("public" if public else "private")
    parts.append(f"max-age={max_age}")

    if s_maxage is not None:
        parts.append(f"s-maxage={s_maxage}")

    if must_revalidate:
        parts.append("must-revalidate")

    if immutable:
        parts.append("immutable")

    response.headers["Cache-Control"] = ", ".join(parts)


# Preset cache strategies for common use cases
def cache_video_metadata(response: Response) -> None:
    """
    Cache strategy for video file metadata.
    1 hour browser cache, 24 hours CloudFront cache.
    Video metadata rarely changes after upload.
    """
    set_cache_control(response, max_age=3600, s_maxage=86400, public=True)


def cache_picture_metadata(response: Response) -> None:
    """
    Cache strategy for picture metadata.
    1 hour browser cache, 24 hours CloudFront cache.
    Picture metadata rarely changes after upload.
    """
    set_cache_control(response, max_age=3600, s_maxage=86400, public=True)


def cache_media_description(response: Response) -> None:
    """
    Cache strategy for media descriptions.
    10 minutes for both browser and CloudFront.
    Allows updates to be visible within 10 minutes while still reducing backend load.
    """
    set_cache_control(response, max_age=600, s_maxage=600, public=True, must_revalidate=True)


def no_cache(response: Response) -> None:
    """
    No caching for authentication endpoints, mutations, and dynamic content.
    Prevents caching of sensitive or frequently-changing data.
    """
    set_cache_control(response, max_age=0, no_store=True)
