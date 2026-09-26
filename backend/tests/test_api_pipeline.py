import pytest
from fastapi.testclient import TestClient
from main import app, create_db_and_tables

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    create_db_and_tables()

@pytest.fixture
def client():
    return TestClient(app)

def test_full_adaptation_pipeline_end_to_end(client):
    screenplay_text = """INT. HAVELI COURTYARD - MORNING

Amar enters holding the letter with urgency.
Ram Singh sits at the accounts table.

AMAR:
Good morning father. The dispatch from the land office has arrived.

RAM SINGH:
Place it on the desk. We will not be hurried by outsiders.
"""
    # 1. Create Project
    res = client.post("/api/projects", data={"name": "EndToEnd Haveli", "raw_screenplay": screenplay_text})
    assert res.status_code == 200
    p_data = res.json()["data"]
    project_id = p_data["id"]
    assert project_id is not None
    assert p_data["status"] == "UPLOADED"

    # 2. Extract & Normalize
    res = client.post(f"/api/projects/{project_id}/extract")
    assert res.status_code == 200
    ext_data = res.json()["data"]
    assert ext_data["scenes_count"] >= 1
    assert ext_data["characters_count"] >= 1

    # 3. Gate 1 Review & Approve
    res = client.get(f"/api/projects/{project_id}/entities")
    assert res.status_code == 200
    entities = res.json()["data"]
    assert len(entities["scenes"]) >= 1

    res = client.patch(f"/api/projects/{project_id}/entities", json={"approve_all": True})
    assert res.status_code == 200

    # 4. Stage 4 Planning
    res = client.post(f"/api/projects/{project_id}/plan", json={
        "culture_id": "malwai",
        "setting": "rural",
        "output_script": "Devanagari"
    })
    assert res.status_code == 200
    plan_data = res.json()["data"]
    assert len(plan_data["decisions"]) > 0

    # 5. Gate 2 Approve Plan
    res = client.patch(f"/api/projects/{project_id}/plan/approve", json={})
    assert res.status_code == 200

    # 6. Stage 6 & 7 Dialogue Adaptation & Verification
    res = client.post(f"/api/projects/{project_id}/adapt")
    assert res.status_code == 200
    adapt_res = res.json()["data"]
    assert adapt_res["adapted_count"] >= 1

    res = client.get(f"/api/projects/{project_id}/adapted")
    assert res.status_code == 200
    adapted_items = res.json()["data"]
    assert len(adapted_items) >= 1
    assert adapted_items[0]["adapted"] is not None

    # 7. Gate 3 Screenplay Approval
    res = client.patch(f"/api/projects/{project_id}/adapted/approve", json={})
    assert res.status_code == 200

    # 8. Stage 9 Visual Generation
    res = client.post(f"/api/projects/{project_id}/generate")
    assert res.status_code == 200
    gen_data = res.json()["data"]
    assert gen_data["generated_count"] >= 1

    # 9. Gallery
    res = client.get(f"/api/projects/{project_id}/gallery")
    assert res.status_code == 200
    gallery = res.json()["data"]
    assert len(gallery) >= 1

    # 10. Continuity & Review Queue
    res = client.get(f"/api/projects/{project_id}/continuity")
    assert res.status_code == 200

    res = client.get(f"/api/projects/{project_id}/review-queue")
    assert res.status_code == 200

    # 11. Export ZIP
    res = client.get(f"/api/projects/{project_id}/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert len(res.content) > 100
