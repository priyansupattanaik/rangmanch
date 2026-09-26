import pytest
import json
from models.character import Character, Costume, Prop
from models.scene import Scene
from models.adaptation import AdaptedScene
from services.normalizer import EntityMaps
from services.continuity import ContinuityTracker
from services.planner import build_adaptation_plan

def test_costume_change_without_story_reason_flagged():
    char = Character(id="CHAR_001", project_id="p1", canonical_name="Amar", role="Protagonist")
    cost1 = Costume(id="COST_001", character_id="CHAR_001", project_id="p1", description="Kurta", scenes='["SC01"]')
    cost2 = Costume(id="COST_002", character_id="CHAR_001", project_id="p1", description="Tuxedo", scenes='[]') # unassigned scene change
    
    tracker = ContinuityTracker()
    warnings = tracker.check_costume_continuity([char], [], [cost1, cost2])
    assert len(warnings) > 0
    assert any("COSTUME_CONTINUITY" in w.type for w in warnings)

def test_two_cultures_share_no_data():
    # Run two parallel adaptations for Malwai and Mewari
    # Assert no decision from culture_A appears in culture_B's plan
    char = Character(id="CHAR_001", project_id="p1", canonical_name="Amar", role="Protagonist")
    entities = EntityMaps(characters=[char], locations=[], costumes=[], props=[], continuity_warnings=[])

    plan_malwai = build_adaptation_plan(entities, "malwai", project_id="p1")
    plan_mewari = build_adaptation_plan(entities, "mewari", project_id="p1")

    decisions_malwai = json.loads(plan_malwai.decisions)
    decisions_mewari = json.loads(plan_mewari.decisions)

    malwai_proposals = {d["proposed"] for d in decisions_malwai}
    mewari_proposals = {d["proposed"] for d in decisions_mewari}

    # Greetings and key terms must not cross-contaminate
    assert "Ram Ram sa" in malwai_proposals
    assert "Khamma Ghani" in mewari_proposals
    assert "Khamma Ghani" not in malwai_proposals
    assert "Ram Ram sa" not in mewari_proposals

    # Distinct IDs and separate memory structures
    assert plan_malwai.culture_id != plan_mewari.culture_id
    assert id(plan_malwai) != id(plan_mewari)
