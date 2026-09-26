import pytest
from services.extractor import extract_screenplay

def test_scene_with_no_header_flagged_as_parse_error():
    raw = "Amar enters. He looks at the letter."  # no INT./EXT. header
    result = extract_screenplay(raw, "test-project")
    assert any(s.status == "PARSE_ERROR" for s in result.scenes)

def test_character_aliases_collected_not_merged():
    raw = "AMAR enters. Later, the elder son sits. A. Singh speaks."
    result = extract_screenplay(raw, "test-project")
    assert len(result.raw_character_mentions) == 3  # collected, not merged yet

def test_valid_scene_parsed_properly():
    raw = """
INT. HAVELI COURTYARD - MORNING

The sun rises over the courtyard. Amar holds the letter.

AMAR:
Good morning father.
"""
    result = extract_screenplay(raw, "test-project")
    assert len(result.scenes) == 1
    sc = result.scenes[0]
    assert sc.status == "PARSED"
    assert sc.int_ext == "INT"
    assert sc.time_of_day == "morning"
    assert "Letter" in sc.props_in
