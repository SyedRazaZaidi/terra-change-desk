from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    token: str
    user: UserOut


class RegionOut(BaseModel):
    id: str
    slug: str
    name: str
    biome: str
    country: str
    lat: float
    lng: float
    area_km2: float
    status: str
    summary: str
    before_rel: str
    after_rel: str
    before_date: str
    after_date: str
    change_pct: float
    loss_km2: float
    kind: str
    open_findings: int = 0

    model_config = {"from_attributes": True}


class FindingOut(BaseModel):
    id: str
    region_id: str
    region_name: str = ""
    kind: str
    severity: str
    status: str
    title: str
    detail: str
    change_pct: float
    confidence: float
    reviewed_by: str
    review_note: str
    created_at: datetime
    reviewed_at: datetime | None
    before_rel: str = ""
    after_rel: str = ""
    before_date: str = ""
    after_date: str = ""
    country: str = ""
    lat: float = 0
    lng: float = 0

    model_config = {"from_attributes": True}


class FindingReview(BaseModel):
    decision: str
    note: str = ""


class DetectQuery(BaseModel):
    threshold: int = 28
    save: bool = True


class BlobOut(BaseModel):
    id: int
    x: int
    y: int
    w: int
    h: int
    area_px: int
    kind: str


class CompositionOut(BaseModel):
    veg_loss: float = 0
    water: float = 0
    built: float = 0
    other: float = 0


class DetectOut(BaseModel):
    change_pct: float
    loss_km2: float
    mask_jpeg_b64: str
    overlay_jpeg_b64: str
    heat_jpeg_b64: str
    labeled_jpeg_b64: str = ""
    histogram: list[int]
    blobs: int
    blob_boxes: list[BlobOut] = []
    largest_px: int
    threshold: int
    greenness_before: float = 0
    greenness_after: float = 0
    composition: CompositionOut
    briefing: str = ""
    finding: FindingOut | None = None


class SeriesPoint(BaseModel):
    date: str
    findings: int
    confirmed: int


class OverviewOut(BaseModel):
    regions_watched: int
    open_findings: int
    pending_review: int
    confirmed_week: int
    mean_change_pct: float
    series: list[SeriesPoint]
    hotspots: list[RegionOut]
    recent: list[FindingOut]


class AuditOut(BaseModel):
    id: str
    actor: str
    action: str
    entity_type: str
    entity_id: str
    detail: str
    created_at: datetime

    model_config = {"from_attributes": True}
