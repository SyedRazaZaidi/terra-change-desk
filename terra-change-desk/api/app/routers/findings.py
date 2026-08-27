from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Finding, User
from ..schemas import FindingOut, FindingReview
from ..security import get_current_user
from ..seed import finding_out, write_audit

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[FindingOut])
def list_findings(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str | None = None,
    region_id: str | None = None,
) -> list[FindingOut]:
    q = db.query(Finding).options(joinedload(Finding.region)).order_by(Finding.created_at.desc())
    if status:
        q = q.filter(Finding.status == status)
    if region_id:
        q = q.filter(Finding.region_id == region_id)
    return [FindingOut.model_validate(finding_out(f)) for f in q.limit(80).all()]


@router.get("/{finding_id}", response_model=FindingOut)
def get_finding(finding_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FindingOut:
    row = db.query(Finding).options(joinedload(Finding.region)).filter(Finding.id == finding_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    return FindingOut.model_validate(finding_out(row))


@router.post("/{finding_id}/review", response_model=FindingOut)
def review_finding(
    finding_id: str,
    body: FindingReview,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FindingOut:
    if body.decision not in {"confirmed", "dismissed"}:
        raise HTTPException(status_code=400, detail="decision must be confirmed or dismissed")
    row = db.query(Finding).options(joinedload(Finding.region)).filter(Finding.id == finding_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    row.status = body.decision
    row.review_note = body.note
    row.reviewed_by = user.name
    row.reviewed_at = datetime.utcnow()
    write_audit(db, user.name, f"finding.{body.decision}", "finding", row.id, body.note or body.decision)
    db.commit()
    db.refresh(row)
    return FindingOut.model_validate(finding_out(row))
