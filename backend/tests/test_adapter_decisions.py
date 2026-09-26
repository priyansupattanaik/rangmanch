from services.adapter import ensure_decisions_applied


def test_high_confidence_greeting_and_kinship_are_applied_when_model_copies_original():
    original = "AMAR:\nGood morning father. The letter is here."
    decisions = [
        {
            "id": "DEC_001",
            "element": "dialogue_tone",
            "original": "Standard Salutation / Hello / Good Morning",
            "proposed": "Ram Ram sa",
            "confidence": "HIGH",
            "human_review": False,
        },
        {
            "id": "DEC_010",
            "element": "kinship",
            "original": "Father",
            "proposed": "bapuji",
            "confidence": "HIGH",
            "human_review": False,
        },
        {
            "id": "DEC_020",
            "element": "dialogue_tone",
            "original": "Formal respect markers (Sir, Mr.)",
            "proposed": "sa suffix for respect (e.g., Hukum sa, Bai sa)",
            "confidence": "HIGH",
            "human_review": False,
        },
    ]
    text, changes = ensure_decisions_applied(original, decisions)
    assert "Ram Ram sa" in text
    assert "bapuji" in text
    assert "letter" in text
    assert "e.g." not in text
    assert {c["decision_id"] for c in changes} == {"DEC_001", "DEC_010"}
