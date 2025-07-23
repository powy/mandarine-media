from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.program import Program
from app.schemas.program import ProgramCreate, ProgramUpdate


class CRUDProgram(CRUDBase[Program, ProgramCreate, ProgramUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Program]:
        return db.query(Program).filter(Program.program_name == name).first()


program = CRUDProgram(Program)