import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from models.character import Character, Costume, Prop
from models.scene import Scene, Location
from services.extractor import ExtractedScreenplay

class EntityMaps(BaseModel):
    characters: List[Character]
    locations: List[Location]
    costumes: List[Costume]
    props: List[Prop]
    continuity_warnings: List[Dict[str, Any]]

def _calculate_name_similarity(name1: str, name2: str) -> float:
    n1 = name1.strip().lower()
    n2 = name2.strip().lower()
    if n1 == n2:
        return 1.0
    
    # Check initials e.g. "Amar" and "A. Singh"
    # or "Vikram" and "V. Sharma"
    m1 = re.match(r"^([a-z])\.\s*([a-z]+)", n1)
    m2 = re.match(r"^([a-z])\.\s*([a-z]+)", n2)
    first1 = n1.split()[0]
    first2 = n2.split()[0]

    if m1 and not m2:
        if first2.startswith(m1.group(1)):
            return 0.75
    elif m2 and not m1:
        if first1.startswith(m2.group(1)):
            return 0.75
    elif m1 and m2:
        if m1.group(1) == m2.group(1):
            return 0.75

    # Role words vs personal names (e.g. "elder son" vs "Amar")
    role_words = ["son", "father", "mother", "sister", "brother", "daughter", "mukhiya", "thakur", "merchant"]
    has_role1 = any(rw in n1 for rw in role_words)
    has_role2 = any(rw in n2 for rw in role_words)
    if has_role1 != has_role2:
        # One is a role descriptor, one is a proper name
        return 0.65

    return 0.2

def resolve_entities_from_mentions(
    mentions: List[str],
    project_id: str = "default_project"
) -> EntityMaps:
    """Helper to resolve character entities directly from a list of mentions."""
    characters: List[Character] = []
    seen_canonical: Dict[str, Character] = {}
    char_counter = 1

    for raw_name in mentions:
        cleaned = raw_name.strip()
        if not cleaned:
            continue
        
        # Check against existing canonicals
        matched_canonical = None
        max_sim = 0.0

        for canon_name, char_obj in seen_canonical.items():
            sim = _calculate_name_similarity(cleaned, canon_name)
            if sim > max_sim:
                max_sim = sim
                matched_canonical = char_obj

        if max_sim >= 0.9:
            # Exact or near-identical: merge alias into canonical
            aliases = json.loads(matched_canonical.aliases)
            if cleaned not in aliases:
                aliases.append(cleaned)
                matched_canonical.aliases = json.dumps(aliases)
        elif max_sim >= 0.5:
            # Ambiguous alias (confidence < 0.9) -> flag for human review
            char_id = f"CHAR_{char_counter:03d}"
            char_counter += 1
            char = Character(
                id=char_id,
                project_id=project_id,
                canonical_name=cleaned,
                aliases=json.dumps([cleaned]),
                role="Role / Persona (Review Needed)",
                relationships=json.dumps({}),
                personality="Dignified, rooted",
                emotional_arc="Resolves family honor vs modern dilemma",
                status="MERGE_CANDIDATE",
                merge_candidate_with=matched_canonical.id if matched_canonical else None,
                approved=False
            )
            characters.append(char)
            seen_canonical[cleaned] = char
        else:
            # Distinct new character
            char_id = f"CHAR_{char_counter:03d}"
            char_counter += 1
            char = Character(
                id=char_id,
                project_id=project_id,
                canonical_name=cleaned,
                aliases=json.dumps([cleaned]),
                role="Dramatis Persona",
                relationships=json.dumps({}),
                personality="Grounded, expressive",
                emotional_arc="Navigates narrative tension",
                status="CANONICAL",
                approved=False
            )
            characters.append(char)
            seen_canonical[cleaned] = char

    # Generate one default costume per character
    costumes: List[Costume] = []
    for idx, c in enumerate(characters, start=1):
        costumes.append(Costume(
            id=f"COST_{idx:03d}",
            character_id=c.id,
            project_id=project_id,
            description=f"Traditional regional attire suited for {c.canonical_name}",
            scenes=json.dumps(["SC01"]),
            approved=False
        ))

    return EntityMaps(
        characters=characters,
        locations=[],
        costumes=costumes,
        props=[],
        continuity_warnings=[]
    )

def resolve_entities(extracted: ExtractedScreenplay) -> EntityMaps:
    """
    Stage 2 — Normalization
    Input: ExtractedScreenplay with raw mentions
    Output: Canonical EntityMaps with merge candidates flagged,
    costumes created, and prop continuity verified.
    """
    project_id = extracted.project_id
    
    # 1. Resolve characters
    entity_maps = resolve_entities_from_mentions(extracted.raw_character_mentions, project_id)
    characters = entity_maps.characters
    costumes = entity_maps.costumes

    # 2. Resolve locations
    locations: List[Location] = []
    seen_locations: Dict[str, Location] = {}
    loc_counter = 1
    
    for raw_loc in extracted.raw_location_mentions:
        cleaned_loc = raw_loc.strip()
        if not cleaned_loc:
            continue
        key = cleaned_loc.lower()
        if key in seen_locations:
            loc = seen_locations[key]
            aliases = json.loads(loc.aliases)
            if cleaned_loc not in aliases:
                aliases.append(cleaned_loc)
                loc.aliases = json.dumps(aliases)
        else:
            loc_id = f"LOC_{loc_counter:03d}"
            loc_counter += 1
            loc = Location(
                id=loc_id,
                project_id=project_id,
                canonical_name=cleaned_loc,
                aliases=json.dumps([cleaned_loc]),
                description=f"Principal setting: {cleaned_loc}"
            )
            seen_locations[key] = loc
            locations.append(loc)

    # 3. Resolve props
    props: List[Prop] = []
    seen_props: Dict[str, Prop] = {}
    prop_counter = 1
    for p_info in extracted.raw_prop_mentions:
        name = p_info["prop"]
        scene_id = p_info["scene_id"]
        key = name.lower()
        if key in seen_props:
            prop = seen_props[key]
            prop.last_seen_scene = scene_id
        else:
            prop_id = f"PROP_{prop_counter:03d}"
            prop_counter += 1
            prop = Prop(
                id=prop_id,
                project_id=project_id,
                name=name,
                last_seen_scene=scene_id,
                holder_character_id=characters[0].id if characters else None
            )
            seen_props[key] = prop
            props.append(prop)

    # 4. Check prop continuity across scenes
    continuity_warnings = check_prop_continuity(props, extracted.scenes)

    return EntityMaps(
        characters=characters,
        locations=locations,
        costumes=costumes,
        props=props,
        continuity_warnings=continuity_warnings
    )

def check_prop_continuity(props: List[Prop], scenes: List[Scene]) -> List[Dict[str, Any]]:
    warnings = []
    for prop in props:
        for i in range(1, len(scenes)):
            prev = scenes[i - 1]
            curr = scenes[i]
            prev_props_out = json.loads(prev.props_out)
            curr_props_in = json.loads(curr.props_in)
            
            # If prop was present in previous scene but missing in next
            if (prop.name in prev_props_out or prop.id in prev_props_out):
                if (prop.name not in curr_props_in and prop.id not in curr_props_in):
                    warnings.append({
                        "type": "PROP_CONTINUITY",
                        "message": f"{prop.name} ({prop.id}) was present in {prev.id} but disappears without explanation in {curr.id}",
                        "severity": "WARNING",
                        "affected_scenes": [prev.id, curr.id]
                    })
    return warnings
