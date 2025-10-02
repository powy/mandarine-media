from typing import List, Optional, Sequence, Tuple, Type, TypeVar

from sqlalchemy.orm import Query

from app.schemas.pagination import Pagination


TModel = TypeVar('TModel')


def _resolve_sort_column(
    model: Type[TModel],
    order_by: Optional[str],
    default_sort: Optional[str],
    allowed_fields: Optional[Sequence[str]] = None,
):
    candidate = order_by or default_sort

    if allowed_fields is not None and candidate not in allowed_fields:
        candidate = default_sort

    column = getattr(model, candidate, None) if candidate else None

    if column is None and default_sort:
        candidate = default_sort
        column = getattr(model, default_sort, None)

    if column is None:
        return None, None

    return column, candidate


def paginate_query(
    query: Query,
    model: Type[TModel],
    *,
    skip: int,
    limit: int,
    order_by: Optional[str] = None,
    order_dir: Optional[str] = None,
    default_sort: Optional[str] = 'creation_date_utc',
    allowed_sort_fields: Optional[Sequence[str]] = None,
) -> Tuple[List[TModel], Pagination]:
    total = query.count()

    column, resolved_field = _resolve_sort_column(
        model,
        order_by,
        default_sort,
        allowed_sort_fields,
    )

    resolved_dir = None
    if column is not None:
        direction = (order_dir or 'asc').lower()
        if direction not in ('asc', 'desc'):
            direction = 'asc'
        query = query.order_by(column.desc() if direction == 'desc' else column.asc())
        resolved_dir = direction

    results = query.offset(skip).limit(limit).all()

    pages = (total + limit - 1) // limit if limit else 0
    page = (skip // limit) + 1 if limit else 1

    pagination = Pagination(
        skip=skip,
        limit=limit,
        total=total,
        page=page,
        pages=pages,
        total_pages=pages,
        has_next=skip + limit < total,
        has_prev=skip > 0,
        order_by=resolved_field,
        order_dir=resolved_dir,
    )

    return results, pagination
