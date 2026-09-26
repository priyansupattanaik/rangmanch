import pytest
from datetime import datetime, timezone
from models.scene import Scene
from models.adaptation import AdaptationPlan, AdaptedScene
from services.verifier import verify_adapted_scene
from services.adapter import adapt_single_scene

@pytest.fixture
def base_plan():
    return AdaptationPlan(
        id="PLAN_TEST",
        project_id="P_001",
        culture_id="malwai",
        dialect="Malwai Rajasthani-Hindi blend",
        region="Madhya Pradesh — Malwa",
        setting="rural",
        output_script="Devanagari",
        decisions="[]",
        approved=True,
        created_at=datetime.now(timezone.utc)
    )

@pytest.fixture
def base_scene():
    return Scene(
        id="SC01",
        project_id="P_001",
        scene_number=1,
        int_ext="INT",
        location_id="LOC_001",
        time_of_day="morning",
        mood="Solemn",
        summary="Amar arrives",
        dramatic_purpose="Establish filial authority",
        raw_text="INT. HAVELI - MORNING\nAmar enters and holds the letter.",
        props_in='["Letter"]',
        props_out='["Letter"]'
    )

def test_verifier_rejects_relationship_reversal(base_plan, base_scene):
    # Amar is superior/elder. Adapted: Amar reversed as subordinate
    adapted = AdaptedScene(
        id="AD_01",
        project_id="P_001",
        scene_id="SC01",
        adaptation_plan_id="PLAN_TEST",
        original_dialogue=base_scene.raw_text,
        adapted_dialogue="AMAR\n(kneels to the younger)\nI surrender all authority to you, my master. (reversal: subordinate)",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )
    result = verify_adapted_scene(base_scene, adapted, base_plan)
    # Verifier must catch this -> CHECK 2 FAIL
    assert not result.passed
    assert any(c.check_number == 2 and not c.passed for c in result.checks)

def test_verifier_rejects_invented_cultural_term(base_plan, base_scene):
    # Adapted dialogue contains an invented cultural term not in cultures.json
    adapted = AdaptedScene(
        id="AD_02",
        project_id="P_001",
        scene_id="SC01",
        adaptation_plan_id="PLAN_TEST",
        original_dialogue=base_scene.raw_text,
        adapted_dialogue="AMAR: We must celebrate the sacred invented_term festival of unknown_tradition.",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )
    result = verify_adapted_scene(base_scene, adapted, base_plan)
    # CHECK 6 FAIL
    assert not result.passed
    assert any(c.check_number == 6 and not c.passed for c in result.checks)

def test_verifier_is_independent_from_adapter(base_plan, base_scene):
    # Verifier and adapter must be separate function calls
    # Test that verifier can evaluate and reject arbitrary adapter output
    adapted = adapt_single_scene(base_scene, base_plan)
    assert adapted is not None
    # Now manually corrupt the adapted scene and assert the independent verifier rejects it
    corrupted_adapted = AdaptedScene(
        id="AD_CORRUPT",
        project_id="P_001",
        scene_id="SC01",
        adaptation_plan_id="PLAN_TEST",
        original_dialogue=base_scene.raw_text,
        adapted_dialogue="AMAR\n(serves his junior)\nHere is your tea, boss. (reversal: subordinate)",
        cultural_changes="[]",
        confidence="HIGH",
        human_review_needed=False
    )
    ver_res = verify_adapted_scene(base_scene, corrupted_adapted, base_plan)
    assert not ver_res.passed
