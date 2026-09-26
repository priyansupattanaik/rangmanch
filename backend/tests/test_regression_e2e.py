import io
import json
import zipfile
import pytest
from fastapi.testclient import TestClient
from main import app, create_db_and_tables

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    create_db_and_tables()

@pytest.fixture
def client():
    return TestClient(app)

SAMPLE_MULTI_SCENE_SCREENPLAY = """INT. HAVELI COURTYARD - MORNING

The sun rises over the sandstone haveli courtyard.
Amar enters holding an ancestral silver seal and a registry deed.
Ram Singh sits at the carved accounts desk examining ledgers.

AMAR:
Good morning father. The revenue inspector has reached the village boundary with the notice.

RAM SINGH:
(stern, without lifting his gaze)
Place the deed on the table. A family that built these archways does not bow to revenue men before tea.

AMAR:
He threatens to confiscate the western orchard by midday.

RAM SINGH:
Let him try. Kaka sa has already gathered the panchayat elders at the chopal.

EXT. VILLAGE CHOPAL - AFTERNOON

Dust swirls across the open gathering ground.
Kaka Sa stands beside the neem tree holding the silver seal.
Amar approaches with the ledger.

AMAR:
The elders have convened, kaka sa. The revenue clerk is demanding the documents.

KAKA SA:
Show him the seal of our forefathers. In this soil, truth outlasts ink.
"""

def test_e2e_pipeline_regression_malwai(client):
    """
    Exhaustive regression test for Malwai cultural adaptation:
    Verifies Extraction, Normalization, Gate 1, Planning, Gate 2,
    Adaptation, 7 Verifier Checks, Gate 3, Visual Gen, and Export ZIP.
    """
    # 1. Project Ingestion
    res = client.post("/api/projects", data={
        "name": "Regression Malwai Epic",
        "raw_screenplay": SAMPLE_MULTI_SCENE_SCREENPLAY
    })
    assert res.status_code == 200
    p_data = res.json()["data"]
    proj_id = p_data["id"]
    assert p_data["status"] == "UPLOADED"

    # 2. Stage 1 & 2: Extraction & Normalization
    res = client.post(f"/api/projects/{proj_id}/extract")
    assert res.status_code == 200
    ext = res.json()["data"]
    assert ext["scenes_count"] == 2
    assert ext["characters_count"] >= 3  # Amar, Ram Singh, Kaka Sa

    # 3. Gate 1: Entity Audit & Approval
    res = client.get(f"/api/projects/{proj_id}/entities")
    assert res.status_code == 200
    ent = res.json()["data"]
    assert len(ent["scenes"]) == 2
    assert len(ent["characters"]) >= 3
    assert len(ent["props"]) >= 1  # silver seal, deed, ledger

    # Approve Gate 1
    res = client.patch(f"/api/projects/{proj_id}/entities", json={"approve_all": True})
    assert res.status_code == 200

    # 4. Stage 4: Adaptation Planning for Malwai
    res = client.post(f"/api/projects/{proj_id}/plan", json={
        "culture_id": "malwai",
        "setting": "rural",
        "output_script": "Devanagari"
    })
    assert res.status_code == 200
    plan_data = res.json()["data"]
    assert plan_data["culture_id"] == "malwai"
    decisions = plan_data["decisions"]
    assert len(decisions) >= 5

    # Check evidence citations in plan decisions
    for d in decisions:
        assert "evidence_field" in d
        assert "reason" in d
        assert d.get("confidence") in ("HIGH", "MEDIUM", "LOW")
        if d.get("confidence") == "LOW":
            assert d.get("human_review") is True

    # 5. Enforcement Check: Gate 2 must block adaptation if not approved
    res = client.post(f"/api/projects/{proj_id}/adapt")
    assert res.json().get("error") is not None
    assert "Gate 2" in res.json()["error"]

    # Now approve Gate 2
    res = client.patch(f"/api/projects/{proj_id}/plan/approve", json={"decisions": decisions})
    assert res.status_code == 200
    assert "Gate 2 passed" in res.json()["data"]["message"]

    # 6. Stage 6 & 7: Dialogue Adaptation & Independent Verifier
    res = client.post(f"/api/projects/{proj_id}/adapt")
    assert res.status_code == 200
    adapt_res = res.json()["data"]
    assert adapt_res["adapted_count"] == 2

    # Verify adapted scenes content and verifier checks
    res = client.get(f"/api/projects/{proj_id}/adapted")
    assert res.status_code == 200
    adapted_items = res.json()["data"]
    assert len(adapted_items) == 2
    for item in adapted_items:
        ad = item["adapted"]
        assert ad is not None
        assert ad["adapted_dialogue"]
        ver_checks = item["verification"]
        assert len(ver_checks) == 7
        check_names = {c["name"] for c in ver_checks}
        assert "Dramatic Purpose Preservation" in check_names
        assert "No Character Relationship Reversal" in check_names
        assert "No Cultural Mixing" in check_names
        assert "No Invented Cultural Facts" in check_names

    # 7. Enforcement Check: Gate 3 must block visual generation before approval
    res = client.post(f"/api/projects/{proj_id}/generate")
    assert res.json().get("error") is not None
    assert "Gate 3 Violation" in res.json()["error"]

    # Now approve Gate 3
    res = client.patch(f"/api/projects/{proj_id}/adapted/approve", json={
        "scene_edits": []
    })
    assert res.status_code == 200
    assert "Gate 3 passed" in res.json()["data"]["message"]

    # 8. Stage 9: Visual Generation
    res = client.post(f"/api/projects/{proj_id}/generate")
    assert res.status_code == 200
    gen_data = res.json()["data"]
    assert gen_data["generated_count"] >= 3

    # Check gallery output
    res = client.get(f"/api/projects/{proj_id}/gallery")
    assert res.status_code == 200
    gallery = res.json()["data"]
    assert len(gallery) >= 3
    for item in gallery:
        assert item["entity_type"] in ("character", "costume", "scene")
        assert item["label"]
        assert item["prompt_used"]

    # 9. Audit Reports
    res = client.get(f"/api/projects/{proj_id}/continuity")
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)

    res = client.get(f"/api/projects/{proj_id}/review-queue")
    assert res.status_code == 200
    rq = res.json()["data"]
    assert "plan_review_items" in rq
    assert "scene_review_items" in rq

    # 10. Stage 10: Export Bundle Verification
    res = client.get(f"/api/projects/{proj_id}/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    
    zip_bytes = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "adapted_screenplay.md" in namelist
        assert "scene_breakdown.json" in namelist
        assert "continuity_report.json" in namelist
        
        md_content = zf.read("adapted_screenplay.md").decode("utf-8")
        assert "MALWAI" in md_content
        assert "SCENE 01" in md_content
        assert "SCENE 02" in md_content

        breakdown_json = json.loads(zf.read("scene_breakdown.json").decode("utf-8"))
        assert len(breakdown_json) == 2

        cont_json = json.loads(zf.read("continuity_report.json").decode("utf-8"))
        assert "warnings" in cont_json

def test_e2e_pipeline_regression_mewari(client):
    """
    Exhaustive regression test for Mewari cultural adaptation
    """
    res = client.post("/api/projects", data={
        "name": "Regression Mewari Saga",
        "raw_screenplay": SAMPLE_MULTI_SCENE_SCREENPLAY
    })
    proj_id = res.json()["data"]["id"]

    client.post(f"/api/projects/{proj_id}/extract")
    client.patch(f"/api/projects/{proj_id}/entities", json={"approve_all": True})

    res = client.post(f"/api/projects/{proj_id}/plan", json={
        "culture_id": "mewari",
        "setting": "rural",
        "output_script": "Devanagari"
    })
    assert res.status_code == 200
    plan_data = res.json()["data"]
    assert plan_data["culture_id"] == "mewari"

    client.patch(f"/api/projects/{proj_id}/plan/approve", json={})
    res = client.post(f"/api/projects/{proj_id}/adapt")
    assert res.status_code == 200
    assert res.json()["data"]["adapted_count"] == 2

def test_e2e_pipeline_regression_majhi(client):
    """
    Exhaustive regression test for Majhi cultural adaptation
    """
    res = client.post("/api/projects", data={
        "name": "Regression Majhi Heritage",
        "raw_screenplay": SAMPLE_MULTI_SCENE_SCREENPLAY
    })
    proj_id = res.json()["data"]["id"]

    client.post(f"/api/projects/{proj_id}/extract")
    client.patch(f"/api/projects/{proj_id}/entities", json={"approve_all": True})

    res = client.post(f"/api/projects/{proj_id}/plan", json={
        "culture_id": "majhi",
        "setting": "rural",
        "output_script": "Latin"
    })
    assert res.status_code == 200
    plan_data = res.json()["data"]
    assert plan_data["culture_id"] == "majhi"

    client.patch(f"/api/projects/{proj_id}/plan/approve", json={})
    res = client.post(f"/api/projects/{proj_id}/adapt")
    assert res.status_code == 200
    assert res.json()["data"]["adapted_count"] == 2

def test_anti_hallucination_cultural_mixing_rejection(client):
    """
    Prime Rule Check 5: Anti-Hallucination verification must reject dialogue
    containing foreign cultural greetings or markers (e.g. Sat Sri Akal in Malwai).
    """
    from services.verifier import verify_adapted_scene
    from models.scene import Scene
    from models.adaptation import AdaptationPlan, AdaptedScene

    scene = Scene(
        id="SC_TEST_01",
        project_id="P_CONTAM",
        scene_number=1,
        slugline="INT. HAVELI - MORNING",
        int_ext="INT",
        location_id="HAVELI",
        time_of_day="morning",
        raw_text="Amar: Hello father."
    )
    plan = AdaptationPlan(
        id="PLAN_MALWAI",
        project_id="P_CONTAM",
        culture_id="malwai",
        dialect="Malwai",
        region="Malwa",
        setting="rural",
        output_script="Devanagari",
        decisions="[]",
        approved=True
    )
    # Contaminated with Majhi greeting 'Sat Sri Akal'
    contaminated_adapted = AdaptedScene(
        id="AD_CONTAM",
        project_id="P_CONTAM",
        scene_id="SC_TEST_01",
        adaptation_plan_id="PLAN_MALWAI",
        original_dialogue="Amar: Hello father.",
        adapted_dialogue="Amar: Sat Sri Akal bapuji, I have brought the papers.",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )

    ver = verify_adapted_scene(scene, contaminated_adapted, plan)
    assert ver.passed is False
    c5 = next(c for c in ver.checks if c.check_number == 5)
    assert c5.passed is False
    assert "Cultural contamination" in c5.reason

def test_anti_hallucination_invented_facts_rejection(client):
    """
    Prime Rule Check 6: Anti-Hallucination verification must reject dialogue
    with ungrounded/invented cultural terms.
    """
    from services.verifier import verify_adapted_scene
    from models.scene import Scene
    from models.adaptation import AdaptationPlan, AdaptedScene

    scene = Scene(
        id="SC_TEST_02",
        project_id="P_INV",
        scene_number=1,
        slugline="INT. HAVELI - MORNING",
        int_ext="INT",
        location_id="HAVELI",
        time_of_day="morning",
        raw_text="Amar: We must proceed."
    )
    plan = AdaptationPlan(
        id="PLAN_MALWAI_2",
        project_id="P_INV",
        culture_id="malwai",
        dialect="Malwai",
        region="Malwa",
        setting="rural",
        output_script="Devanagari",
        decisions="[]",
        approved=True
    )
    invented_adapted = AdaptedScene(
        id="AD_INV",
        project_id="P_INV",
        scene_id="SC_TEST_02",
        adaptation_plan_id="PLAN_MALWAI_2",
        original_dialogue="Amar: We must proceed.",
        adapted_dialogue="Amar: We must perform the ancient fantasy_ritual of the clan.",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )

    ver = verify_adapted_scene(scene, invented_adapted, plan)
    assert ver.passed is False
    c6 = next(c for c in ver.checks if c.check_number == 6)
    assert c6.passed is False
    assert "ungrounded cultural terms" in c6.reason

def test_anti_hallucination_relationship_reversal_rejection(client):
    """
    Prime Rule Check 2: Verifier must detect and reject relationship reversal
    where elder/superior is placed in subordinate stance without narrative reason.
    """
    from services.verifier import verify_adapted_scene
    from models.scene import Scene
    from models.adaptation import AdaptationPlan, AdaptedScene

    scene = Scene(
        id="SC_TEST_03",
        project_id="P_REV",
        scene_number=1,
        slugline="INT. HAVELI - MORNING",
        int_ext="INT",
        location_id="HAVELI",
        time_of_day="morning",
        raw_text="Ram Singh advises Amar."
    )
    plan = AdaptationPlan(
        id="PLAN_MALWAI_3",
        project_id="P_REV",
        culture_id="malwai",
        dialect="Malwai",
        region="Malwa",
        setting="rural",
        output_script="Devanagari",
        decisions="[]",
        approved=True
    )
    reversed_adapted = AdaptedScene(
        id="AD_REV",
        project_id="P_REV",
        scene_id="SC_TEST_03",
        adaptation_plan_id="PLAN_MALWAI_3",
        original_dialogue="Ram Singh advises Amar.",
        adapted_dialogue="Ram Singh: Amar sa, reversal: subordinate stance where elder begs junior for permission.",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )

    ver = verify_adapted_scene(scene, reversed_adapted, plan)
    assert ver.passed is False
    c2 = next(c for c in ver.checks if c.check_number == 2)
    assert c2.passed is False
    assert "relationship hierarchy reversal" in c2.reason

def test_pipeline_order_enforcement_plan_before_extraction(client):
    """
    Enforce stage ordering: Cannot call /plan before extraction is executed.
    """
    res = client.post("/api/projects", data={
        "name": "Out of Order Project",
        "raw_screenplay": "INT. ROOM - NIGHT\n\nSpeaker: Hello."
    })
    proj_id = res.json()["data"]["id"]

    # Attempt to plan directly without extracting
    res = client.post(f"/api/projects/{proj_id}/plan", json={"culture_id": "malwai"})
    assert res.json().get("error") is not None
    assert "Project must be extracted first" in res.json()["error"]

def test_non_ascii_unicode_screenplay_extraction_and_planning(client):
    """
    Verify robust handling of non-ASCII / Devanagari character names and parentheticals.
    """
    screenplay_unicode = """INT. बैठक - प्रातःकाल

अमर enters holding the letter.
राम सिंह sits at the wooden desk with a scroll.

अमर:
(हाथ जोड़कर, विनम्रता से)
सुप्रभात पिताजी। पटवारी की सूचना आ चुकी है।

राम सिंह:
(दृढ़ स्वर में)
कागज़ात यहाँ मेज़ पर रख दो।
"""
    res = client.post("/api/projects", data={
        "name": "Unicode Hindi Script",
        "raw_screenplay": screenplay_unicode
    })
    assert res.status_code == 200
    proj_id = res.json()["data"]["id"]

    # Extract
    res = client.post(f"/api/projects/{proj_id}/extract")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["scenes_count"] >= 1

    # Gate 1 approve
    res = client.patch(f"/api/projects/{proj_id}/entities", json={"approve_all": True})
    assert res.status_code == 200

    # Gate 2 plan
    res = client.post(f"/api/projects/{proj_id}/plan", json={"culture_id": "mewari", "output_script": "Devanagari"})
    assert res.status_code == 200
    assert len(res.json()["data"]["decisions"]) > 0

def test_check7_subtitle_reading_speed_warning(client):
    """
    Prime Rule Check 7: Dialogue with massive uninterrupted text chunk (>60 words)
    must trigger Check 7 warning.
    """
    from services.verifier import verify_adapted_scene
    from models.scene import Scene
    from models.adaptation import AdaptationPlan, AdaptedScene

    scene = Scene(
        id="SC_SPEED_01",
        project_id="P_SPEED",
        scene_number=1,
        slugline="INT. ROOM - MORNING",
        int_ext="INT",
        location_id="ROOM",
        time_of_day="morning",
        raw_text="Speaker speaks long monologue."
    )
    plan = AdaptationPlan(
        id="PLAN_SPEED",
        project_id="P_SPEED",
        culture_id="malwai",
        dialect="Malwai",
        region="Malwa",
        setting="rural",
        output_script="Devanagari",
        decisions="[]",
        approved=True
    )
    # A single continuous sentence with over 65 words
    huge_monologue = "Amar: " + " ".join(["word"] * 70)
    adapted = AdaptedScene(
        id="AD_SPEED",
        project_id="P_SPEED",
        scene_id="SC_SPEED_01",
        adaptation_plan_id="PLAN_SPEED",
        original_dialogue="Speaker speaks long monologue.",
        adapted_dialogue=huge_monologue,
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )

    ver = verify_adapted_scene(scene, adapted, plan)
    c7 = next(c for c in ver.checks if c.check_number == 7)
    assert c7.passed is False
    assert "exceeding subtitle reading speed" in c7.reason


