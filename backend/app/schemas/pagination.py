from pydantic import BaseModel
from typing import Generic, List, TypeVar

T = TypeVar('T')

class PaginationInfo(BaseModel):
    skip: int
    limit: int
    total: int
    page: int
    pages: int

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: PaginationInfo