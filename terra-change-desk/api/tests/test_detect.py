from app.detect import detect_change
from app.security import hash_password, verify_password
from app.tiles import _forest_base, _paint_scar
import numpy as np
import cv2


def test_password() -> None:
    h = hash_password("terra-demo")
    assert verify_password("terra-demo", h)


def test_change_detects_scar() -> None:
    before = _forest_base(240, 400, 3)
    after = _paint_scar(before, "deforest", 9)
    b = cv2.cvtColor(np.array(before), cv2.COLOR_RGB2BGR)
    a = cv2.cvtColor(np.array(after), cv2.COLOR_RGB2BGR)
    result = detect_change(b, a)
    assert result["change_pct"] > 4
    assert result["mask"].max() == 255
    assert result["blobs"] >= 1
    assert result["blob_boxes"]
    assert "veg_loss" in result["composition"]
    assert result["greenness_before"] != 0 or result["greenness_after"] != 0
