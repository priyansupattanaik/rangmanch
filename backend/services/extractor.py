import re
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from models.scene import Scene
from services.llm import LLMClient

class ExtractedScreenplay(BaseModel):
    project_id: str
    scenes: List[Scene]
    raw_character_mentions: List[str]
    raw_prop_mentions: List[Dict[str, Any]]
    raw_location_mentions: List[str]

# Common prop keywords to detect in screenplay action lines & dialogue
PROP_KEYWORDS = [
    "letter", "envelope", "sword", "gun", "revolver", "pistol",
    "knife", "dagger", "keys", "key", "ring", "necklace", "box",
    "diary", "book", "bag", "briefcase", "document", "papers",
    "will", "dispatch", "telegram", "turban", "pagdi", "amulet", "locket"
]

# Patterns for character identification
CHARACTER_ROLE_PATTERNS = [
    r"\b(?:elder son|younger son|elder sister|younger sister|father|mother|daughter|patriarch|matriarch|merchant|constable|officer|servant|priest|thakur|mukhiya|landlord)\b",
    r"\b[A-Z]\.\s*[A-Z][a-z]+\b",  # e.g. A. Singh, V. Sharma
    r"\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b" # e.g. AMAR, RAM SINGH, KUNWAR AMAR
]

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from PDF, DOCX, or fallback plain text."""
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = "\n".join([page.get_text() for page in doc])
            return text
        except Exception as e:
            print(f"[Extractor] PDF parse failed: {e}")
    elif lower_name.endswith(".docx"):
        try:
            import io
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([p.text for p in doc.paragraphs if p.text])
            return text
        except Exception as e:
            print(f"[Extractor] DOCX parse failed: {e}")

    # Fallback UTF-8 / Latin-1 decode
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="replace")

def _detect_character_mentions(text: str) -> List[str]:
    mentions: List[str] = []
    
    # 1. Dialogue speaker pattern: e.g. "AMAR:" or "AMAR (V.O.):" or "AMAR\n..."
    speaker_matches = re.findall(r"^([A-Z][A-Z0-9\s\.\-]{1,25})(?:\s*\([^\)]*\))?\s*:", text, flags=re.MULTILINE)
    for sm in speaker_matches:
        cleaned = sm.strip()
        if cleaned and cleaned not in ("INT", "EXT", "SCENE", "CONTINUED", "CUT TO", "FADE IN"):
            mentions.append(cleaned)

    # 2. Named role patterns (case-insensitive for roles like elder son)
    role_pattern = r"\b(?:elder son|younger son|elder sister|younger sister|father|mother|daughter|patriarch|matriarch|merchant|constable|officer|servant|priest|thakur|mukhiya|landlord)\b"
    for m in re.finditer(role_pattern, text, flags=re.IGNORECASE):
        val = m.group(0).strip().lower()
        if val not in [m.lower() for m in mentions]:
            mentions.append(m.group(0).strip())

    # 3. Initial + Surname (e.g. A. Singh) - case sensitive
    initial_pattern = r"\b[A-Z]\.\s*[A-Z][a-z]+\b"
    for m in re.finditer(initial_pattern, text):
        val = m.group(0).strip()
        if val not in mentions:
            mentions.append(val)

    # 4. All-caps character names in the body. Sluglines (INT. HAVELI COURTYARD - MORNING)
    # are locations and times, not characters.
    body = "\n".join(
        line for line in text.splitlines()
        if not re.match(r"^\s*(INT\.|EXT\.|I/E\.|INT/EXT\.)", line)
    )
    caps_pattern = r"\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b"
    for m in re.finditer(caps_pattern, body):
        val = m.group(0).strip()
        if val.upper() in ("INT", "EXT", "CUT TO", "FADE IN", "FADE OUT", "CONTINUED", "SCENE", "THE", "AND"):
            continue
        if len(val) >= 2 and val not in mentions:
            mentions.append(val)
                
    return mentions

def _detect_prop_mentions(text: str, scene_id: str) -> List[Dict[str, Any]]:
    props: List[Dict[str, Any]] = []
    text_lower = text.lower()
    for kw in PROP_KEYWORDS:
        # Match whole word
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, text_lower):
            props.append({
                "prop": kw.capitalize(),
                "scene_id": scene_id,
                "context": kw
            })
    return props

def extract_screenplay(raw_text: str, project_id: str, llm_client: Optional[LLMClient] = None) -> ExtractedScreenplay:
    """
    Stage 1 — Extraction
    Parses scenes by INT./EXT. headers, records raw character & prop mentions.
    Flags unparseable text as PARSE_ERROR.
    Uses LLM (or mock) for mood & dramatic_purpose.
    """
    if llm_client is None:
        llm_client = LLMClient()

    # Normalize newlines
    normalized_text = raw_text.replace("\r\n", "\n").strip()
    
    # Header regex: INT. or EXT.
    header_pattern = re.compile(
        r"(^(?:INT\.|EXT\.|INT/EXT\.|INT\./EXT\.)\s+[^\n]+)",
        re.MULTILINE | re.IGNORECASE
    )
    
    headers = list(header_pattern.finditer(normalized_text))
    scenes: List[Scene] = []
    all_raw_characters: List[str] = []
    all_raw_props: List[Dict[str, Any]] = []
    all_raw_locations: List[str] = []

    # If no headers found at all -> entire text is a PARSE_ERROR scene
    if not headers:
        # Collect mentions anyway for analysis
        raw_chars = _detect_character_mentions(normalized_text)
        all_raw_characters.extend(raw_chars)
        raw_props = _detect_prop_mentions(normalized_text, "SC01")
        all_raw_props.extend(raw_props)
        
        scenes.append(Scene(
            id="SC01",
            project_id=project_id,
            scene_number=1,
            int_ext="UNKNOWN",
            location_id="LOC_UNKNOWN",
            sub_location=None,
            time_of_day="UNKNOWN",
            mood="UNCERTAIN",
            summary="Scene header missing. Unparseable scene text.",
            dramatic_purpose="UNCERTAIN",
            raw_text=normalized_text,
            characters_present=json.dumps(list(set(raw_chars))),
            props_in=json.dumps([p["prop"] for p in raw_props]),
            props_out=json.dumps([p["prop"] for p in raw_props]),
            status="PARSE_ERROR"
        ))
        return ExtractedScreenplay(
            project_id=project_id,
            scenes=scenes,
            raw_character_mentions=all_raw_characters,
            raw_prop_mentions=all_raw_props,
            raw_location_mentions=[]
        )

    # Process chunks between headers
    for idx, match in enumerate(headers):
        scene_num = idx + 1
        scene_id = f"SC{scene_num:02d}"
        
        header_text = match.group(1).strip()
        start_idx = match.start()
        end_idx = headers[idx + 1].start() if idx + 1 < len(headers) else len(normalized_text)
        scene_chunk = normalized_text[start_idx:end_idx].strip()

        # Parse header line
        # e.g., INT. HAVELI COURTYARD - MORNING
        int_ext_match = re.match(r"^(INT\.|EXT\.|INT/EXT\.|INT\./EXT\.)\s*(.*)", header_text, re.IGNORECASE)
        if int_ext_match:
            int_ext = "INT" if "INT" in int_ext_match.group(1).upper() else "EXT"
            rest = int_ext_match.group(2).strip()
            
            # Split location and time_of_day by hyphen or dash
            parts = re.split(r"\s+[-–—]\s+", rest, maxsplit=1)
            raw_loc = parts[0].strip() if len(parts) > 0 else "UNKNOWN"
            time_of_day = parts[1].strip().lower() if len(parts) > 1 else "day"
            all_raw_locations.append(raw_loc)
            loc_id = f"LOC_{scene_num:03d}"
        else:
            int_ext = "UNKNOWN"
            raw_loc = "UNKNOWN"
            time_of_day = "day"
            loc_id = f"LOC_{scene_num:03d}"

        # Mentions in this scene
        scene_chars = _detect_character_mentions(scene_chunk)
        for c in scene_chars:
            all_raw_characters.append(c)

        scene_props = _detect_prop_mentions(scene_chunk, scene_id)
        all_raw_props.extend(scene_props)

        # One LLM call per scene to extract mood, dramatic_purpose, emotional_change
        llm_prompt = f"""
Analyze this screenplay scene:
{scene_chunk}

Output a strictly valid JSON object with keys:
"mood": short atmospheric descriptor taken from this scene,
"dramatic_purpose": the narrative job this scene performs, taken from this scene,
"emotional_change": how the characters' feelings shift in this scene.
Infer these from the scene text. Do not answer UNCERTAIN for a scene that has action or dialogue.
"""
        analyst = "You are a dramatic screenplay analyst. Judge only the scene text supplied by the user. This is dramaturgy, not a cultural-fact lookup."
        try:
            llm_res = llm_client.call(llm_prompt, analyst)
            parsed_json = json.loads(llm_res)
            mood = parsed_json.get("mood") or "Dramatic"
            dramatic_purpose = parsed_json.get("dramatic_purpose") or "Advance narrative conflict"
            if str(mood).strip().upper() == "UNCERTAIN" or str(dramatic_purpose).strip().upper() == "UNCERTAIN":
                llm_res = llm_client.call(
                    llm_prompt + "\nThe scene text is present. Infer mood and dramatic_purpose from it. Do not use the word UNCERTAIN.",
                    analyst,
                )
                parsed_json = json.loads(llm_res)
                mood = parsed_json.get("mood") or "Dramatic"
                dramatic_purpose = parsed_json.get("dramatic_purpose") or "Advance narrative conflict"
            if str(mood).strip().upper() == "UNCERTAIN":
                mood = "Dramatic"
            if str(dramatic_purpose).strip().upper() == "UNCERTAIN":
                dramatic_purpose = "Establish narrative conflict"
        except Exception:
            mood = "Dramatic"
            dramatic_purpose = "Establish narrative conflict"

        summary_lines = [l.strip() for l in scene_chunk.split("\n") if l.strip() and not l.startswith("INT.") and not l.startswith("EXT.")]
        summary = " ".join(summary_lines[:2]) if summary_lines else header_text

        scenes.append(Scene(
            id=scene_id,
            project_id=project_id,
            scene_number=scene_num,
            int_ext=int_ext,
            location_id=loc_id,
            sub_location=None,
            time_of_day=time_of_day,
            mood=mood,
            summary=summary[:250],
            dramatic_purpose=dramatic_purpose,
            raw_text=scene_chunk,
            characters_present=json.dumps(list(dict.fromkeys(scene_chars))),
            props_in=json.dumps([p["prop"] for p in scene_props]),
            props_out=json.dumps([p["prop"] for p in scene_props]),
            status="PARSED"
        ))

    return ExtractedScreenplay(
        project_id=project_id,
        scenes=scenes,
        raw_character_mentions=all_raw_characters,
        raw_prop_mentions=all_raw_props,
        raw_location_mentions=all_raw_locations
    )
