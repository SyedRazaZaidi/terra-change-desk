from fastapi.testclient import TestClient

from app.main import app


def test_login_overview():
    with TestClient(app) as client:
        assert client.get("/health").json()["ok"] == "terra"
        bad = client.post("/auth/login", json={"email": "analyst@terra.dev", "password": "nope"})
        assert bad.status_code == 401
        ok = client.post("/auth/login", json={"email": "analyst@terra.dev", "password": "terra-demo"})
        token = ok.json()["token"]
        ov = client.get("/overview", headers={"Authorization": f"Bearer {token}"})
        assert ov.status_code == 200
        assert ov.json()["regions_watched"] >= 3
        tile = client.get("/tiles/rio_tapajos_before.png")
        assert tile.status_code == 200
        det = client.get("/regions/rio_tapajos/analyze?threshold=28", headers={"Authorization": f"Bearer {token}"})
        assert det.status_code == 200
        body = det.json()
        assert body["blobs"] >= 1
        assert "briefing" in body
        assert "composition" in body
