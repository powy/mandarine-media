from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    media_descriptions,
    video_files,
    public_persons,
    media_uploads,
    description_reports,
    video_file_reports,
    programs,
    seasons,
    languages,
    countries,
    pictures,
    content_lists,
    screen_descriptions,
    audience_categories,
    subscription_plans,
    media_themes,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    media_descriptions.router, prefix="/media-descriptions", tags=["media-descriptions"]
)
api_router.include_router(
    video_files.router, prefix="/video-files", tags=["video-files"]
)
api_router.include_router(
    public_persons.router, prefix="/persons", tags=["public-persons"]
)
api_router.include_router(
    media_uploads.router, prefix="/upload", tags=["media-uploads"]
)
api_router.include_router(
    description_reports.router,
    prefix="/description-reports",
    tags=["description-reports"],
)
api_router.include_router(
    video_file_reports.router, prefix="/video-file-reports", tags=["video-file-reports"]
)
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(seasons.router, prefix="/seasons", tags=["seasons"])
api_router.include_router(languages.router, prefix="/languages", tags=["languages"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(pictures.router, prefix="/pictures", tags=["pictures"])
api_router.include_router(
    content_lists.router, prefix="/content-lists", tags=["content-lists"]
)
api_router.include_router(
    screen_descriptions.router,
    prefix="/screen-descriptions",
    tags=["screen-descriptions"],
)
api_router.include_router(
    audience_categories.router,
    prefix="/audience-categories",
    tags=["audience-categories"],
)
api_router.include_router(
    subscription_plans.router, prefix="/subscription-plans", tags=["subscription-plans"]
)
api_router.include_router(
    media_themes.router, prefix="/media-themes", tags=["media-themes"]
)
