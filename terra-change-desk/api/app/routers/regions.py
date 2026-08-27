from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..detect import briefing_text, detect_change, encode_jpeg_b64, load_bgr
from ..models import Finding, Region, User
from ..schemas import DetectOut, FindingOut, RegionOut
from ..security import get_current_user
from ..seed import finding_out, nid, region_out, tiles_path, write_audit

router = APIRouter(prefix="/regions", tags=["regions"])


def _pack(r: Region, result: dict, finding: Finding | None) -> DetectOut:
    return DetectOut(
        change_pct=result["change_pct"],
        loss_km2=round(r.area_km2 * result["change_pct"] / 100.0, 1),
        mask_jpeg_b64=encode_jpeg_b64(result["mask"]),
        overlay_jpeg_b64=encode_jpeg_b64(result["overlay"]),
        heat_jpeg_b64=encode_jpeg_b64(result["heat"]),
        labeled_jpeg_b64=encode_jpeg_b64(result["labeled"]),
        histogram=result["histogram"],
        blobs=result["blobs"],
        blob_boxes=result["blob_boxes"],
        largest_px=result["largest_px"],
        threshold=result["threshold"],
        greenness_before=result["greenness_before"],
        greenness_after=result["greenness_after"],
        composition=result["composition"],
        briefing=briefing_text(r.name, r.kind, result, r.area_km2),
        finding=FindingOut.model_validate(finding_out(finding)) if finding else None,
    )


def _run(r: Region, threshold: int) -> dict:
    before = load_bgr(tiles_path() / r.before_rel)
    after = load_bgr(tiles_path() / r.after_rel)
    return detect_change(before, after, threshold=threshold)


@router.get("", response_model=list[RegionOut])
def list_regions(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[RegionOut]:
    rows = db.query(Region).order_by(Region.change_pct.desc()).all()
    out = []
    for r in rows:
        open_n = (
            db.query(Finding)
            .filter(Finding.region_id == r.id, Finding.status.in_(["open", "pending_review"]))
            .count()
        )
        out.append(RegionOut.model_validate(region_out(r, open_n)))
    return out


@router.get("/{region_id}", response_model=RegionOut)
def get_region(region_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> RegionOut:
    r = db.query(Region).filter((Region.id == region_id) | (Region.slug == region_id)).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Region not found")
    open_n = (
        db.query(Finding)
        .filter(Finding.region_id == r.id, Finding.status.in_(["open", "pending_review"]))
        .count()
    )
    return RegionOut.model_validate(region_out(r, open_n))


@router.get("/{region_id}/analyze", response_model=DetectOut)
def analyze(
    region_id: str,
    threshold: int = Query(default=28, ge=8, le=80),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DetectOut:
    r = db.query(Region).filter((Region.id == region_id) | (Region.slug == region_id)).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Region not found")
    result = _run(r, threshold)
    return _pack(r, result, None)


@router.post("/{region_id}/detect", response_model=DetectOut)
def run_detect(
    region_id: str,
    threshold: int = Query(default=28, ge=8, le=80),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DetectOut:
    r = db.query(Region).filter((Region.id == region_id) | (Region.slug == region_id)).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Region not found")
    result = _run(r, threshold)
    r.change_pct = result["change_pct"]
    r.loss_km2 = round(r.area_km2 * r.change_pct / 100.0, 1)
    finding = Finding(
        id=nid("fnd"),
        region_id=r.id,
        kind=r.kind,
        severity="high" if r.change_pct >= 12 else "medium",
        status="open",
        title=f"{r.change_pct:.1f}% change · {r.name}",
        detail=(
            f"Threshold {result['threshold']}. {result['blobs']} change blobs "
            f"(largest {result['largest_px']} px). Confirm if this is real land-cover change."
        ),
        change_pct=r.change_pct,
        confidence=0.78,
    )
    db.add(finding)
    write_audit(db, user.name, "region.detect", "region", r.id, f"{r.change_pct}% t={threshold}")
    db.commit()
    finding = db.query(Finding).options(joinedload(Finding.region)).filter(Finding.id == finding.id).first()
    return _pack(r, result, finding)
