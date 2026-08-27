from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditEvent, User
from ..schemas import AuditOut
from ..security import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditOut])
def list_audit(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[AuditOut]:
    rows = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100).all()
    return [AuditOut.model_validate(r) for r in rows]
