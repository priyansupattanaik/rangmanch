import pytest
import json
from models.character import Prop
from models.scene import Scene
from services.normalizer import resolve_entities_from_mentions, check_prop_continuity

def test_ambiguous_alias_flagged_not_auto_merged():
    mentions = ["AMAR", "elder son", "A. Singh"]
    result = resolve_entities_from_mentions(mentions)
    # If confidence of merge < 0.9, should be MERGE_CANDIDATE not canonical
    assert result.characters[0].status in ["CANONICAL", "MERGE_CANDIDATE"]
    assert any(c.status == "MERGE_CANDIDATE" for c in result.characters)

def test_same_prop_in_consecutive_scenes_no_warning():
    # Prop in SC01 props_out, SC02 props_in -> no warning
    p = Prop(id="PROP_001", project_id="p1", name="Letter", last_seen_scene="SC02")
    sc1 = Scene(
        id="SC01", project_id="p1", scene_number=1, int_ext="INT",
        location_id="LOC_001", time_of_day="day", mood="Tense",
        summary="S1", dramatic_purpose="DP1", raw_text="text1",
        props_in='["PROP_001"]', props_out='["PROP_001"]'
    )
    sc2 = Scene(
        id="SC02", project_id="p1", scene_number=2, int_ext="EXT",
        location_id="LOC_002", time_of_day="night", mood="Solemn",
        summary="S2", dramatic_purpose="DP2", raw_text="text2",
        props_in='["PROP_001"]', props_out='["PROP_001"]'
    )
    warnings = check_prop_continuity([p], [sc1, sc2])
    assert len(warnings) == 0

def test_prop_disappears_generates_warning():
    # Prop in SC01 props_out, not in SC02 at all -> WARNING
    p = Prop(id="PROP_001", project_id="p1", name="Letter", last_seen_scene="SC01")
    sc1 = Scene(
        id="SC01", project_id="p1", scene_number=1, int_ext="INT",
        location_id="LOC_001", time_of_day="day", mood="Tense",
        summary="S1", dramatic_purpose="DP1", raw_text="text1",
        props_in='["PROP_001"]', props_out='["PROP_001"]'
    )
    sc2 = Scene(
        id="SC02", project_id="p1", scene_number=2, int_ext="EXT",
        location_id="LOC_002", time_of_day="night", mood="Solemn",
        summary="S2", dramatic_purpose="DP2", raw_text="text2",
        props_in='[]', props_out='[]'
    )
    warnings = check_prop_continuity([p], [sc1, sc2])
    assert len(warnings) > 0
    assert "PROP_CONTINUITY" in warnings[0]["type"]
    assert "Letter" in warnings[0]["message"]
