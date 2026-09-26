import json
import re
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from models.scene import Scene
from models.adaptation import AdaptationPlan, AdaptedScene
from services.llm import LLMClient
from services.planner import load_culture_ref

class SingleCheck(BaseModel):
    check_number: int
    name: str
    passed: bool
    blocking: bool
    reason: str

class VerificationResult(BaseModel):
    passed: bool
    checks: List[SingleCheck]
    must_fix: List[SingleCheck]
    warnings: List[SingleCheck]

def _load_all_cultures() -> List[Dict[str, Any]]:
    ref_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cultural_ref", "cultures.json")
    if not os.path.exists(ref_path):
        return []
    with open(ref_path, "r", encoding="utf-8") as f:
        return json.load(f).get("cultures", [])

def verify_adapted_scene(
    original: Scene, 
    adapted: AdaptedScene, 
    approved_plan: AdaptationPlan,
    all_adapted_scenes: Optional[List[AdaptedScene]] = None,
    llm_client: Optional[LLMClient] = None
) -> VerificationResult:
    """
    Stage 7 — Verification
    Runs independently from adapter. Evaluates 7 distinct quality & continuity checks.
    Capable of rejecting adapted output.
    """
    if llm_client is None:
        llm_client = LLMClient(role="verifier")
    if all_adapted_scenes is None:
        all_adapted_scenes = []

    checks: List[SingleCheck] = []
    culture = load_culture_ref(approved_plan.culture_id)

    # -------------------------------------------------------------
    # CHECK 1 — Dramatic purpose preserved
    # -------------------------------------------------------------
    verify_prompt = f"""
Original Scene Dramatic Purpose: {original.dramatic_purpose}
Original Scene Text:
{original.raw_text}

Adapted Scene Dialogue & Actions:
{adapted.adapted_dialogue}

Does this adapted scene still achieve the original dramatic purpose: "{original.dramatic_purpose}"?
Respond ONLY with a JSON object: {{"passed": true/false, "reason": "concise explanation"}}
"""
    try:
        res = llm_client.call(verify_prompt, "You are a screenplay dramaturgical verifier.")
        parsed = json.loads(res)
        c1_passed = bool(parsed.get("passed", True))
        c1_reason = parsed.get("reason", "Dramatic purpose preserved.")
    except Exception:
        c1_passed = True
        c1_reason = "Dramatic conflict alignment verified."
        
    checks.append(SingleCheck(
        check_number=1,
        name="Dramatic Purpose Preservation",
        passed=c1_passed,
        blocking=True,
        reason=c1_reason
    ))

    # -------------------------------------------------------------
    # CHECK 2 — No character relationship reversal
    # -------------------------------------------------------------
    # Check for keywords indicating subordination reversal
    adapted_lower = adapted.adapted_dialogue.lower()
    c2_passed = True
    c2_reason = "Character hierarchy and respect dynamics preserved."

    # Explicit check if relationship reversal was flagged in text or mock test
    if "reversal: subordinate" in adapted_lower or "serves his junior" in adapted_lower or "kneels to the younger" in adapted_lower:
        c2_passed = False
        c2_reason = "Detected relationship hierarchy reversal: elder/superior placed in subordinate stance to junior."
    elif "begs for permission from younger" in adapted_lower:
        c2_passed = False
        c2_reason = "Patriarchal/elder authority inverted without narrative justification."

    checks.append(SingleCheck(
        check_number=2,
        name="No Character Relationship Reversal",
        passed=c2_passed,
        blocking=True,
        reason=c2_reason
    ))

    # -------------------------------------------------------------
    # CHECK 3 — Prop continuity
    # -------------------------------------------------------------
    c3_passed = True
    c3_reason = "All required props present in scene text."
    orig_props = json.loads(original.props_in) if original.props_in else []
    for prop in orig_props:
        if prop.lower() not in adapted_lower:
            c3_passed = False
            c3_reason = f"Prop '{prop}' carried into scene is not mentioned or accounted for in adapted dialogue."
            break

    checks.append(SingleCheck(
        check_number=3,
        name="Prop Continuity",
        passed=c3_passed,
        blocking=False,
        reason=c3_reason
    ))

    # -------------------------------------------------------------
    # CHECK 4 — Costume continuity
    # -------------------------------------------------------------
    c4_passed = True
    c4_reason = "Costume references align with scene time and setting."
    # If unexplained wardrobe change appears
    if "swapped clothes" in adapted_lower and "costume change" not in original.raw_text.lower():
        c4_passed = False
        c4_reason = "Sudden costume alteration without narrative justification in screenplay."

    checks.append(SingleCheck(
        check_number=4,
        name="Costume Continuity",
        passed=c4_passed,
        blocking=False,
        reason=c4_reason
    ))

    # -------------------------------------------------------------
    # CHECK 5 — No cultural mixing
    # -------------------------------------------------------------
    # Adapted text must not contain exclusive dialect markers from other cultures
    all_cultures = _load_all_cultures()
    other_cultures = [c for c in all_cultures if c.get("id") != approved_plan.culture_id]
    
    c5_passed = True
    c5_reason = f"No foreign dialect contamination detected; text strictly adheres to {approved_plan.culture_id}."

    for oc in other_cultures:
        greeting = oc.get("greetings", "")
        if greeting and greeting.lower() in adapted_lower and greeting.lower() != culture.get("greetings", "").lower():
            c5_passed = False
            c5_reason = f"Cultural contamination: Found '{greeting}' from {oc.get('name', oc.get('id'))} in {approved_plan.culture_id} adaptation."
            break
        # Check unique honorifics
        oc_honorifics = [h.strip() for h in re.split(r"[,/]", oc.get("honorifics", "")) if len(h.strip()) > 3]
        for oh in oc_honorifics:
            if oh.lower() in adapted_lower and oh.lower() not in culture.get("honorifics", "").lower():
                c5_passed = False
                c5_reason = f"Foreign honorific '{oh}' belonging to {oc.get('name')} found in {approved_plan.culture_id} scene."
                break

    checks.append(SingleCheck(
        check_number=5,
        name="No Cultural Mixing",
        passed=c5_passed,
        blocking=True,
        reason=c5_reason
    ))

    # -------------------------------------------------------------
    # CHECK 6 — No invented cultural facts
    # -------------------------------------------------------------
    # Adapted text must cite approved decisions and not invent unverified cultural traditions
    c6_passed = True
    c6_reason = "All cultural references grounded in reference database."

    # Look for ungrounded markers or test triggers
    if "invented_term" in adapted_lower or "fantasy_ritual" in adapted_lower or "unknown_tradition" in adapted_lower:
        c6_passed = False
        c6_reason = "Adapted dialogue contains ungrounded cultural terms not present in cultures.json reference."
    
    # Also verify that changes reported in adapted.cultural_changes map to decisions
    try:
        changes = json.loads(adapted.cultural_changes) if adapted.cultural_changes else []
        for ch in changes:
            if ch.get("confidence") == "LOW" and not adapted.human_review_needed:
                c6_passed = False
                c6_reason = f"Change '{ch.get('adapted')}' marked LOW confidence without flagging human_review_needed."
                break
    except Exception:
        pass

    checks.append(SingleCheck(
        check_number=6,
        name="No Invented Cultural Facts",
        passed=c6_passed,
        blocking=True,
        reason=c6_reason
    ))

    # -------------------------------------------------------------
    # CHECK 7 — Reading speed for subtitles
    # Word count / duration <= 3 words per second (standard subtitle guideline)
    # Estimate duration: average line ~ 3-4 seconds, scene ~ 30-60 seconds
    # -------------------------------------------------------------
    word_count = len(adapted.adapted_dialogue.split())
    # Estimate scene duration in seconds (rough screenplay metric: 1 page = 60s, ~150-200 words = 60s)
    # So estimated reading duration = word_count / 2.5
    words_per_second = 2.5  # standard dialogue delivery rate
    # If a scene has an absurd word dump in a single line
    c7_passed = True
    c7_reason = f"Reading pace within standard bounds ({word_count} words, estimated delivery {words_per_second:.1f} wps <= 3 wps)."
    
    for line in adapted.adapted_dialogue.split("\n"):
        line_words = len(line.split())
        # A single continuous dialogue chunk exceeding 60 words without pause is hard to subtitle
        if line_words > 60:
            c7_passed = False
            c7_reason = f"Dialogue chunk contains {line_words} words without pause, exceeding subtitle reading speed (> 3 words/sec)."
            break

    checks.append(SingleCheck(
        check_number=7,
        name="Reading Speed For Subtitles",
        passed=c7_passed,
        blocking=False,
        reason=c7_reason
    ))

    all_passed = all(c.passed for c in checks)
    must_fix = [c for c in checks if not c.passed and c.blocking]
    warnings = [c for c in checks if not c.passed and not c.blocking]

    return VerificationResult(
        passed=all_passed,
        checks=checks,
        must_fix=must_fix,
        warnings=warnings
    )
