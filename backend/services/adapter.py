import json
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from models.scene import Scene
from models.adaptation import AdaptationPlan, AdaptedScene
from services.llm import LLMClient
from services.planner import load_culture_ref
from services.verifier import verify_adapted_scene, VerificationResult

SCENE_ADAPTATION_PROMPT = """
You are adapting screenplay dialogue for the {culture_id} culture.

APPROVED DECISIONS (follow exactly):
{approved_decisions_json}

CULTURE REFERENCE (use only these facts):
{culture_excerpt_json}

ORIGINAL SCENE:
{original_scene_text}

TASK:
Rewrite the dialogue and action lines for this culture.
For every change, record: what changed, which approved decision it follows.
If you are uncertain about a cultural detail not in the reference → 
set that line's confidence to LOW and write: NEEDS_REVIEW: [specific question]
Do NOT invent cultural facts not in the reference.
Keep every physical prop from the original scene in the adapted text, and keep its English noun
(for example letter, desk, lamp) so continuity can be checked.
Do not import greetings, kinship terms, or honorifics from any culture other than {culture_id}.
Apply every HIGH-confidence decision that matches this scene. The adapted_dialogue must not be a copy of the original when a greeting or kinship decision applies.

OUTPUT FORMAT (JSON only, no preamble):
{{
  "adapted_dialogue": "...",
  "changes": [
    {{
      "original": "...",
      "adapted": "...",
      "decision_id": "...",
      "confidence": "HIGH|MEDIUM|LOW"
    }}
  ],
  "review_items": ["..."]
}}
"""

def ensure_decisions_applied(text: str, decisions: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
    """Apply short HIGH-confidence substitutions the model left out. Nothing is invented."""
    updated = text
    applied: List[Dict[str, Any]] = []
    for dec in decisions:
        if dec.get("confidence") != "HIGH" or dec.get("human_review"):
            continue
        proposed = str(dec.get("proposed") or "").strip()
        original_label = str(dec.get("original") or "").strip()
        if not proposed or len(proposed) > 60 or "e.g." in proposed.lower():
            continue
        if proposed.lower() in updated.lower():
            continue
        element = dec.get("element")
        pattern = None
        if element == "dialogue_tone" and "good morning" in original_label.lower():
            pattern = r"\bgood morning\b"
        elif element == "kinship" and original_label:
            pattern = rf"\b{re.escape(original_label)}\b"
        elif element == "character_name" and original_label:
            pattern = rf"\b{re.escape(original_label)}\b"
        if not pattern:
            continue
        rewritten, count = re.subn(pattern, proposed, updated, flags=re.IGNORECASE)
        if count:
            applied.append({
                "original": original_label,
                "adapted": proposed,
                "decision_id": dec.get("id", ""),
                "confidence": "HIGH",
            })
            updated = rewritten
    return updated, applied


def adapt_single_scene(
    scene: Scene,
    approved_plan: AdaptationPlan,
    llm_client: Optional[LLMClient] = None
) -> AdaptedScene:
    """Adapts a single screenplay scene using only approved plan decisions."""
    if llm_client is None:
        llm_client = LLMClient()

    culture = load_culture_ref(approved_plan.culture_id)
    culture_excerpt = {
        "id": culture.get("id"),
        "name": culture.get("name"),
        "region": culture.get("region"),
        "dialect_notes": culture.get("dialect_notes"),
        "kinship_terms": culture.get("kinship_terms"),
        "honorifics": culture.get("honorifics"),
        "common_idioms": culture.get("common_idioms"),
        "architecture": culture.get("architecture"),
        "typical_wardrobe": culture.get("typical_wardrobe_male_or_female", culture.get("typical_wardrobe_male")),
        "greetings": culture.get("greetings")
    }

    prompt = SCENE_ADAPTATION_PROMPT.format(
        culture_id=approved_plan.culture_id,
        approved_decisions_json=approved_plan.decisions,
        culture_excerpt_json=json.dumps(culture_excerpt, indent=2),
        original_scene_text=scene.raw_text
    )

    response_text = ""
    try:
        response_text = llm_client.call(prompt, "You are a professional cultural screenplay adapter. Return JSON only.")
        data = json.loads(response_text)
        adapted_dialogue = data.get("adapted_dialogue", scene.raw_text)
        if not isinstance(adapted_dialogue, str):
            adapted_dialogue = scene.raw_text
        changes = data.get("changes", [])
        if not isinstance(changes, list):
            changes = []
        normalized_changes = []
        for change in changes:
            if isinstance(change, dict):
                normalized_changes.append(change)
            elif isinstance(change, str) and change.strip():
                normalized_changes.append({
                    "original": "",
                    "adapted": change.strip(),
                    "decision_id": "",
                    "confidence": "MEDIUM",
                })
        changes = normalized_changes
        review_items = data.get("review_items", [])
        if not isinstance(review_items, list):
            review_items = []
    except Exception as e:
        print(f"[Adapter Error] Scene {scene.id} adaptation failed to parse JSON: {e}. Response head: {response_text[:500]!r}")
        adapted_dialogue = scene.raw_text
        changes = []
        review_items = [f"JSON Parse Failure: {str(e)} - retry recommended"]

    try:
        decision_list = json.loads(approved_plan.decisions) if isinstance(approved_plan.decisions, str) else approved_plan.decisions
    except Exception:
        decision_list = []
    adapted_dialogue, applied = ensure_decisions_applied(adapted_dialogue or scene.raw_text, decision_list or [])
    if applied:
        changes = list(changes) + applied

    # Determine confidence and review requirement
    has_low = any(c.get("confidence") == "LOW" for c in changes) or len(review_items) > 0
    confidence = "LOW" if has_low else ("MEDIUM" if any(c.get("confidence") == "MEDIUM" for c in changes) else "HIGH")
    human_review = has_low or (confidence == "LOW")
    review_reason = "; ".join(review_items) if review_items else ("Low confidence adaptation decisions need review" if human_review else None)

    adapted_scene_id = f"ADAPT_{scene.project_id[:8]}_{scene.id}_{uuid.uuid4().hex[:6]}"
    adapted = AdaptedScene(
        id=adapted_scene_id,
        project_id=scene.project_id,
        scene_id=scene.id,
        adaptation_plan_id=approved_plan.id,
        original_dialogue=scene.raw_text,
        adapted_dialogue=adapted_dialogue,
        cultural_changes=json.dumps(changes),
        confidence=confidence,
        human_review_needed=human_review,
        review_reason=review_reason,
        continuity_warnings="[]",
        verification_passed=False,
        verification_details="{}"
    )

    # Stage 7 Verification: Run verifier BEFORE storing!
    ver_res = verify_adapted_scene(scene, adapted, approved_plan)
    adapted.verification_passed = ver_res.passed
    adapted.verification_details = json.dumps([c.model_dump() for c in ver_res.checks])
    adapted.continuity_warnings = json.dumps([w.model_dump() for w in ver_res.warnings])
    
    if not ver_res.passed:
        adapted.human_review_needed = True
        must_fix_reasons = [m.reason for m in ver_res.must_fix]
        adapted.review_reason = (adapted.review_reason + " | " if adapted.review_reason else "") + "; ".join(must_fix_reasons)

    return adapted

def adapt_all_scenes(
    scenes: List[Scene],
    approved_plan: AdaptationPlan,
    llm_client: Optional[LLMClient] = None
) -> List[AdaptedScene]:
    """Iterates through each scene individually and adapts with verifier checks."""
    if not approved_plan.approved:
        raise ValueError("Cannot adapt scenes: AdaptationPlan must be approved by human first (Gate 2).")

    adapted_scenes: List[AdaptedScene] = []
    for sc in scenes:
        adapted = adapt_single_scene(sc, approved_plan, llm_client=llm_client)
        adapted_scenes.append(adapted)
    return adapted_scenes
