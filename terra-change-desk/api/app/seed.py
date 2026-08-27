from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from .config import settings
from .detect import detect_change, load_bgr
from .models import AuditEvent, Finding, Region, User
from .security import hash_password
from .tiles import generate_all

DEMO_PASSWORD = "terra-demo"


def nid(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(6)}"


def write_audit(db: Session, actor: str, action: str, entity_type: str, entity_id: str, detail: str = "") -> None:
    db.add(
        AuditEvent(
            id=nid("aud"),
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
        )
    )


def tiles_path() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / settings.tiles_dir


def region_out(row: Region, open_findings: int = 0) -> dict:
    return {
        "id": row.id,
        "slug": row.slug,
        "name": row.name,
        "biome": row.biome,
        "country": row.country,
        "lat": row.lat,
        "lng": row.lng,
        "area_km2": row.area_km2,
        "status": row.status,
        "summary": row.summary,
        "before_rel": row.before_rel,
        "after_rel": row.after_rel,
        "before_date": row.before_date,
        "after_date": row.after_date,
        "change_pct": row.change_pct,
        "loss_km2": row.loss_km2,
        "kind": row.kind,
        "open_findings": open_findings,
    }


def finding_out(row: Finding) -> dict:
    region = row.region
    return {
        "id": row.id,
        "region_id": row.region_id,
        "region_name": region.name if region else "",
        "kind": row.kind,
        "severity": row.severity,
        "status": row.status,
        "title": row.title,
        "detail": row.detail,
        "change_pct": row.change_pct,
        "confidence": row.confidence,
        "reviewed_by": row.reviewed_by,
        "review_note": row.review_note,
        "created_at": row.created_at,
        "reviewed_at": row.reviewed_at,
        "before_rel": region.before_rel if region else "",
        "after_rel": region.after_rel if region else "",
        "before_date": region.before_date if region else "",
        "after_date": region.after_date if region else "",
        "country": region.country if region else "",
        "lat": region.lat if region else 0,
        "lng": region.lng if region else 0,
    }


def seed_if_empty(db: Session) -> None:
    generate_all(tiles_path())
    if db.query(User).first():
        return

    db.add_all(
        [
            User(
                id="usr_raza",
                email="analyst@terra.dev",
                name="Syed Raza",
                role="analyst",
                password_hash=hash_password(DEMO_PASSWORD),
            ),
            User(
                id="usr_elio",
                email="lead@terra.dev",
                name="Elio Voss",
                role="lead",
                password_hash=hash_password(DEMO_PASSWORD),
            ),
        ]
    )

    tapajos = Region(
        id="reg_tapajos",
        slug="rio_tapajos",
        name="Rio Tapajós fringe",
        biome="Tropical moist forest",
        country="Brazil",
        lat=-4.28,
        lng=-56.12,
        area_km2=1840,
        status="alert",
        kind="deforest",
        summary="New logging spurs off an unofficial road. Canopy loss concentrated on the eastern terrace.",
        before_rel="rio_tapajos_before.png",
        after_rel="rio_tapajos_after.png",
        before_date="2024-06-12",
        after_date="2026-07-03",
        change_pct=0,
        loss_km2=0,
    )
    sindh = Region(
        id="reg_sindh",
        slug="sindh_basin",
        name="Sindh river plain",
        biome="Irrigated alluvial",
        country="Pakistan",
        lat=27.85,
        lng=68.76,
        area_km2=960,
        status="watch",
        kind="flood",
        summary="Standing water expanded across the southern fields after monsoon peak.",
        before_rel="sindh_basin_before.png",
        after_rel="sindh_basin_after.png",
        before_date="2025-04-02",
        after_date="2026-08-19",
        change_pct=0,
        loss_km2=0,
    )
    delta = Region(
        id="reg_delta",
        slug="delta_fringe",
        name="Delta fringe lots",
        biome="Coastal mosaic",
        country="Vietnam",
        lat=10.41,
        lng=106.72,
        area_km2=420,
        status="watch",
        kind="urban",
        summary="Hardscape infill along the canal. Likely warehouse pads, not seasonal crop.",
        before_rel="delta_fringe_before.png",
        after_rel="delta_fringe_after.png",
        before_date="2023-11-20",
        after_date="2026-05-14",
        change_pct=0,
        loss_km2=0,
    )
    haze = Region(
        id="reg_haze",
        slug="cusco_haze",
        name="Cusco foothills",
        biome="Dry montane",
        country="Peru",
        lat=-13.52,
        lng=-71.97,
        area_km2=310,
        status="watch",
        kind="haze",
        summary="Bright patches that appeared overnight. Almost always cloud — a teaching false alarm.",
        before_rel="cusco_haze_before.png",
        after_rel="cusco_haze_after.png",
        before_date="2026-07-01",
        after_date="2026-07-08",
        change_pct=0,
        loss_km2=0,
    )
    db.add_all([tapajos, sindh, delta, haze])
    db.flush()

    now = datetime.utcnow()
    for region in (tapajos, sindh, delta, haze):
        before = load_bgr(tiles_path() / region.before_rel)
        after = load_bgr(tiles_path() / region.after_rel)
        result = detect_change(before, after)
        pct = result["change_pct"]
        region.change_pct = pct
        region.loss_km2 = round(region.area_km2 * pct / 100.0, 1)

    db.add_all(
        [
            Finding(
                id="fnd_tapajos",
                region_id=tapajos.id,
                kind="deforest",
                severity="high",
                status="open",
                title="Canopy loss along new spur roads",
                detail="Change mask lights up linear scars — typical of unofficial extraction, not a single burn scar.",
                change_pct=tapajos.change_pct,
                confidence=0.86,
                created_at=now - timedelta(hours=6),
            ),
            Finding(
                id="fnd_sindh",
                region_id=sindh.id,
                kind="flood",
                severity="high",
                status="pending_review",
                title="Inundation expanded on the south bank",
                detail="Blue-shift vs April baseline. Confirm against river-gauge peak before publishing.",
                change_pct=sindh.change_pct,
                confidence=0.81,
                created_at=now - timedelta(days=1, hours=4),
            ),
            Finding(
                id="fnd_delta",
                region_id=delta.id,
                kind="urban",
                severity="medium",
                status="open",
                title="Hardscape infill on canal lots",
                detail="Rectilinear change — more construction than phenology.",
                change_pct=delta.change_pct,
                confidence=0.74,
                created_at=now - timedelta(days=2),
            ),
            Finding(
                id="fnd_old",
                region_id=tapajos.id,
                kind="deforest",
                severity="low",
                status="dismissed",
                title="Seasonal senescence (false change)",
                detail="Dismissed — dry-season browning, not clearing.",
                change_pct=3.2,
                confidence=0.48,
                reviewed_by="Syed Raza",
                review_note="Phenology, not loss.",
                created_at=now - timedelta(days=11),
                reviewed_at=now - timedelta(days=10),
            ),
            Finding(
                id="fnd_haze",
                region_id=haze.id,
                kind="haze",
                severity="low",
                status="open",
                title="Bright patches over the foothills",
                detail="The mask will light up. That does not mean the hill moved. Dismiss as cloud.",
                change_pct=haze.change_pct,
                confidence=0.41,
                created_at=now - timedelta(hours=3),
            ),
        ]
    )
    write_audit(db, "system", "seed", "workspace", "ws_terra", "Loaded four AOIs with synthetic Sentinel-like tiles")
    write_audit(db, "Elio Voss", "region.alert", "region", tapajos.id, "Raised Tapajós to alert")
    db.commit()


def ensure_haze_aoi(db: Session) -> None:
    generate_all(tiles_path())
    if db.query(Region).filter(Region.slug == "cusco_haze").first():
        return
    if not db.query(User).first():
        return
    haze = Region(
        id="reg_haze",
        slug="cusco_haze",
        name="Cusco foothills",
        biome="Dry montane",
        country="Peru",
        lat=-13.52,
        lng=-71.97,
        area_km2=310,
        status="watch",
        kind="haze",
        summary="Bright patches that appeared overnight. Almost always cloud — a teaching false alarm.",
        before_rel="cusco_haze_before.png",
        after_rel="cusco_haze_after.png",
        before_date="2026-07-01",
        after_date="2026-07-08",
        change_pct=0,
        loss_km2=0,
    )
    db.add(haze)
    db.flush()
    before = load_bgr(tiles_path() / haze.before_rel)
    after = load_bgr(tiles_path() / haze.after_rel)
    result = detect_change(before, after)
    haze.change_pct = result["change_pct"]
    haze.loss_km2 = round(haze.area_km2 * haze.change_pct / 100.0, 1)
    db.add(
        Finding(
            id="fnd_haze",
            region_id=haze.id,
            kind="haze",
            severity="low",
            status="open",
            title="Bright patches over the foothills",
            detail="The mask will light up. That does not mean the hill moved. Dismiss as cloud.",
            change_pct=haze.change_pct,
            confidence=0.41,
        )
    )
    write_audit(db, "system", "seed", "region", haze.id, "Added Cusco haze false-alarm AOI")
    db.commit()


def ensure_analyst_identity(db: Session) -> None:
    user = db.query(User).filter(User.email == "analyst@terra.dev").first()
    if user is None:
        return
    old = user.name
    if old == "Syed Raza":
        return
    user.name = "Syed Raza"
    for row in db.query(Finding).filter(Finding.reviewed_by == old).all():
        row.reviewed_by = "Syed Raza"
    for row in db.query(AuditEvent).filter(AuditEvent.actor == old).all():
        row.actor = "Syed Raza"
    write_audit(db, "system", "identity", "user", user.id, f"{old} → Syed Raza")
    db.commit()
