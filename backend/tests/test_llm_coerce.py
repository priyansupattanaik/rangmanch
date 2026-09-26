from services.llm import coerce_model_text


def test_strips_markdown_fence_around_json():
    raw = '```json\n{"mood": "tense"}\n```'
    assert coerce_model_text(raw) == '{"mood": "tense"}'


def test_extracts_json_object_from_preamble():
    raw = 'Here is the result:\n{"passed": true, "reason": "kept"}'
    assert coerce_model_text(raw).startswith("{")
    assert '"passed": true' in coerce_model_text(raw)
