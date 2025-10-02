from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel
from pydantic.generics import GenericModel


T = TypeVar('T')


class Pagination(BaseModel):
    skip: int
    limit: int
    total: int
    page: int
    pages: int
    total_pages: int
    has_next: bool
    has_prev: bool
    order_by: Optional[str] = None
    order_dir: Optional[str] = None


class PaginatedResponse(GenericModel, Generic[T]):
    data: List[T]
    pagination: Pagination
