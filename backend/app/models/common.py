from sqlalchemy import TypeDecorator, CHAR, String, Text
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.dialects.postgresql import ARRAY as PostgresARRAY
import uuid
import json


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(32), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(postgresql.UUID())
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value)).replace('-', '')
            else:
                return str(value).replace('-', '')

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


class JSONArray(TypeDecorator):
    """Platform-independent array type.
    Uses PostgreSQL's ARRAY type, otherwise uses TEXT storing as JSON.
    """
    impl = Text
    cache_ok = True

    def __init__(self, item_type=None):
        self.item_type = item_type
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresARRAY(String))
        else:
            return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value  # PostgreSQL handles arrays natively
        else:
            # For SQLite, store as JSON string
            return json.dumps(value) if value else '[]'

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value  # PostgreSQL returns arrays natively
        else:
            # For SQLite, parse JSON string
            try:
                return json.loads(value) if value else []
            except (json.JSONDecodeError, TypeError):
                return []