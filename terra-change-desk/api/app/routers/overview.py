from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Finding, Region, User
from ..schemas import OverviewOut
from ..security import get_current_user
from ..seed import finding_out, region_out

router = APIRouter(tags=["overview"])


@router.get("/overview", response_model=OverviewOut)
def overview(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> OverviewOut:
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = start - timedelta(days=6)
    regions = db.query(Region).all()
    open_n = db.query(Finding).filter(Finding.status.in_(["open", "pending_review"])).count()
    pending = db.query(Finding).filter(Finding.status == "pending_review").count()
    confirmed = (
        db.query(Finding)
        .filter(Finding.status == "confirmed", Finding.reviewed_at != None, Finding.reviewed_at >= week)  # noqa: E711
        .count()
    )
    mean_change = round(sum(r.change_pct for r in regions) / len(regions), 2) if regions else 0.0
    series = []
    for i in range(6, -1, -1):
        day = (start - timedelta(days=i)).date()
        day_s = datetime.combine(day, datetime.min.time())
        day_e = day_s + timedelta(days=1)
        rows = db.query(Finding).filter(Finding.created_at >= day_s, Finding.created_at < day_e).all()
        series.append(
            {
                "date": day.isoformat(),
                "findings": len(rows),
                "confirmed": len([r for r in rows if r.status == "confirmed"]),
            }
        )
    hotspots = sorted(regions, key=lambda r: r.change_pct, reverse=True)[:3]
    recent = (
        db.query(Finding)
        .options(joinedload(Finding.region))
        .order_by(Finding.created_at.desc())
        .limit(6)
        .all()
    )
    return OverviewOut(
        regions_watched=len(regions),
        open_findings=open_n,
        pending_review=pending,
        confirmed_week=confirmed,
        mean_change_pct=mean_change,
        series=series,
        hotspots=[region_out(r) for r in hotspots],
        recent=[finding_out(f) for f in recent],
    )
