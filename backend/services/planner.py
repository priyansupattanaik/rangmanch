import json
import os
import copy
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from models.character import Character
from models.scene import Location
from models.adaptation import AdaptationPlan
from services.normalizer import EntityMaps

class AdaptationDecision(BaseModel):
    id: str
    element: str          # "character_name" | "location" | "dialogue_tone" | "prop" | "wardrobe" | "kinship"
    original: str
    proposed: str
    reason: str
    evidence_field: str   # exact field in cultures.json e.g. "kinship_terms.elder_brother"
    confidence: str       # HIGH | MEDIUM | LOW
    human_review: bool

def load_culture_ref(culture_id: str) -> Dict[str, Any]:
    """Loads a specific culture profile from cultures.json."""
    ref_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cultural_ref", "cultures.json")
    if not os.path.exists(ref_path):
        raise FileNotFoundError(f"Cultural reference file not found at {ref_path}")
    
    with open(ref_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for item in data.get("cultures", []):
        if item.get("id") == culture_id:
            # Return deepcopy to ensure zero shared state across parallel runs
            return copy.deepcopy(item)
            
    raise ValueError(f"Culture ID '{culture_id}' not found in reference database.")

def list_available_cultures() -> List[Dict[str, Any]]:
    ref_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cultural_ref", "cultures.json")
    if not os.path.exists(ref_path):
        return []
    with open(ref_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("cultures", [])

def get_nested(data: Dict[str, Any], path: str) -> Optional[Any]:
    """Retrieves value by dot-notation path, e.g. 'kinship_terms.elder_brother'."""
    keys = path.split(".")
    curr: Any = data
    for k in keys:
        if isinstance(curr, dict) and k in curr:
            curr = curr[k]
        else:
            return None
    return curr

def assert_no_hallucination(decision: AdaptationDecision, culture: Dict[str, Any]) -> None:
    """
    Enforces Section 8 anti-hallucination constraints:
    - If confidence is HIGH, evidence_field MUST resolve to a real path in cultures.json.
    - If confidence is LOW, human_review MUST be True.
    """
    if decision.confidence == "HIGH":
        value = get_nested(culture, decision.evidence_field)
        if value is None:
            raise ValueError(
                f"Decision claims HIGH confidence but evidence_field '{decision.evidence_field}' "
                f"not found in culture reference. Set confidence=LOW and human_review=True."
            )
    
    if not decision.human_review and decision.confidence == "LOW":
        raise ValueError("LOW confidence decisions must have human_review=True")

def build_adaptation_plan(
    entities: EntityMaps,
    culture_id: str,
    project_id: str = "default_project",
    setting: str = "rural",
    output_script: str = "Devanagari"
) -> AdaptationPlan:
    """
    Stage 4 — Adaptation Planning
    Strictly derives adaptation decisions citing cultures.json.
    Missing facts are demoted to LOW confidence with human_review=True.
    """
    culture = load_culture_ref(culture_id)
    decisions: List[AdaptationDecision] = []
    dec_counter = 1

    # 1. Adapt Greetings and Honorifics
    greeting_field = "greetings"
    greeting_val = get_nested(culture, greeting_field)
    if greeting_val:
        dec = AdaptationDecision(
            id=f"DEC_{dec_counter:03d}",
            element="dialogue_tone",
            original="Standard Salutation / Hello / Good Morning",
            proposed=greeting_val,
            reason=f"Apply authentic {culture.get('name', culture_id)} cultural greeting",
            evidence_field=greeting_field,
            confidence="HIGH",
            human_review=False
        )
    else:
        dec = AdaptationDecision(
            id=f"DEC_{dec_counter:03d}",
            element="dialogue_tone",
            original="Standard Salutation",
            proposed="Namaste",
            reason="Cultural knowledge not found in reference",
            evidence_field="greetings",
            confidence="LOW",
            human_review=True
        )
    assert_no_hallucination(dec, culture)
    decisions.append(dec)
    dec_counter += 1

    honorific_field = "honorifics"
    honorific_val = get_nested(culture, honorific_field)
    if honorific_val:
        dec = AdaptationDecision(
            id=f"DEC_{dec_counter:03d}",
            element="dialogue_tone",
            original="Formal respect markers (Sir, Mr.)",
            proposed=honorific_val,
            reason=f"Integrate dialectal honorific suffix from {culture.get('name', culture_id)} tradition",
            evidence_field=honorific_field,
            confidence="HIGH",
            human_review=False
        )
    else:
        dec = AdaptationDecision(
            id=f"DEC_{dec_counter:03d}",
            element="dialogue_tone",
            original="Formal respect markers",
            proposed="Ji",
            reason="Cultural knowledge not found in reference",
            evidence_field="honorifics",
            confidence="LOW",
            human_review=True
        )
    assert_no_hallucination(dec, culture)
    decisions.append(dec)
    dec_counter += 1

    # 2. Adapt Kinship Terms
    kinship = culture.get("kinship_terms", {})
    for role_key, term in kinship.items():
        ev_field = f"kinship_terms.{role_key}"
        dec = AdaptationDecision(
            id=f"DEC_{dec_counter:03d}",
            element="kinship",
            original=role_key.replace("_", " ").title(),
            proposed=term,
            reason=f"Use authentic kinship address for {role_key}",
            evidence_field=ev_field,
            confidence="HIGH",
            human_review=False
        )
        assert_no_hallucination(dec, culture)
        decisions.append(dec)
        dec_counter += 1

    # 3. Adapt Characters (Names & Roles)
    naming_conventions = culture.get("naming_conventions", {})
    sample_names = naming_conventions.get("sample_names", {})

    for char in entities.characters:
        canon_name = char.canonical_name
        # Match against sample names or generate standard grounded derivation
        matched_name = None
        ev_field = ""
        for s_key, s_val in sample_names.items():
            if s_key.lower() in canon_name.lower():
                matched_name = s_val
                ev_field = f"naming_conventions.sample_names.{s_key}"
                break
        
        if matched_name and ev_field:
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="character_name",
                original=canon_name,
                proposed=matched_name,
                reason=f"Adapt character name to {culture.get('name', culture_id)} conventions",
                evidence_field=ev_field,
                confidence="HIGH",
                human_review=False
            )
        else:
            # Missing from sample names -> Flag human review
            suffixes = naming_conventions.get("male_suffixes", ["Singh"])
            suffix = suffixes[0] if suffixes else ""
            if not suffix or suffix.lower() in canon_name.lower():
                proposed_fallback = canon_name
            else:
                proposed_fallback = f"{canon_name} {suffix}"
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="character_name",
                original=canon_name,
                proposed=proposed_fallback,
                reason="Cultural knowledge not found in reference",
                evidence_field="naming_conventions.uncertain",
                confidence="LOW",
                human_review=True
            )

        assert_no_hallucination(dec, culture)
        decisions.append(dec)
        dec_counter += 1

    # 4. Adapt Locations (Architecture)
    arch_field = "architecture"
    arch_val = get_nested(culture, arch_field)
    for loc in entities.locations:
        if arch_val:
            short_arch = arch_val.split(",")[0].strip()
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="location",
                original=loc.canonical_name,
                proposed=f"{loc.canonical_name} — {short_arch}",
                reason=f"Infuse {culture.get('name', culture_id)} architecture: {arch_val}",
                evidence_field=arch_field,
                confidence="HIGH",
                human_review=False
            )
        else:
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="location",
                original=loc.canonical_name,
                proposed=loc.canonical_name,
                reason="Cultural knowledge not found in reference",
                evidence_field=arch_field,
                confidence="LOW",
                human_review=True
            )
        assert_no_hallucination(dec, culture)
        decisions.append(dec)
        dec_counter += 1

    # 5. Adapt Costumes / Wardrobe
    wardrobe_field = "typical_wardrobe_male_or_female"
    wardrobe_val = get_nested(culture, wardrobe_field) or get_nested(culture, "typical_wardrobe_male")
    for cost in entities.costumes:
        if wardrobe_val:
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="wardrobe",
                original=cost.description,
                proposed=wardrobe_val,
                reason=f"Adapt wardrobe to authentic regional fabrics and styles",
                evidence_field=wardrobe_field if get_nested(culture, wardrobe_field) else "typical_wardrobe_male",
                confidence="HIGH",
                human_review=False
            )
        else:
            dec = AdaptationDecision(
                id=f"DEC_{dec_counter:03d}",
                element="wardrobe",
                original=cost.description,
                proposed=cost.description,
                reason="Cultural knowledge not found in reference",
                evidence_field="typical_wardrobe_male",
                confidence="LOW",
                human_review=True
            )
        assert_no_hallucination(dec, culture)
        decisions.append(dec)
        dec_counter += 1

    plan_id = f"PLAN_{culture_id}_{int(datetime.now(timezone.utc).timestamp())}"
    return AdaptationPlan(
        id=plan_id,
        project_id=project_id,
        culture_id=culture_id,
        dialect=culture.get("dialect_notes", "Regional Dialect"),
        region=culture.get("region", "Regional Belt"),
        setting=setting,
        output_script=output_script,
        decisions=json.dumps([d.model_dump() for d in decisions]),
        approved=False,
        created_at=datetime.now(timezone.utc)
    )
