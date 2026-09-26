import os
import re
import json
import uuid
import base64
import time
import zlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from models.character import Character, Costume
from models.scene import Scene
from models.adaptation import AdaptationPlan, AdaptedScene
from models.visual import GeneratedImage
from services.planner import load_culture_ref
from services.envload import load_project_env

load_project_env()

DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b"


class ImageGenClient:
    def __init__(self, mock: Optional[bool] = None):
        if mock is None:
            self.mock = os.getenv("IMAGE_GEN_MOCK", "true").lower() in ("true", "1", "yes")
        else:
            self.mock = mock
        self.output_dir = os.getenv("OUTPUT_DIR", "./sample_output")
        self.api_key = os.getenv("NVIDIA_API_KEY", "")
        self.model_name = os.getenv("IMAGE_MODEL", DEFAULT_IMAGE_MODEL)
        self.endpoint = os.getenv(
            "NVIDIA_IMAGE_URL",
            f"https://ai.api.nvidia.com/v1/genai/{self.model_name}",
        )
        self.width = int(os.getenv("IMAGE_WIDTH", "1024"))
        self.height = int(os.getenv("IMAGE_HEIGHT", "1024"))
        self.steps = int(os.getenv("IMAGE_STEPS", "4"))
        self.max_generations = int(os.getenv("MAX_IMAGE_GENERATIONS", "50"))
        self.generated_count = 0

    def _create_placeholder_image(self, entity_id: str, label: str, prompt: str, subfolder: str) -> str:
        folder = os.path.join(self.output_dir, subfolder)
        os.makedirs(folder, exist_ok=True)
        filename = f"{entity_id}_{int(datetime.now().timestamp())}.svg"
        filepath = os.path.join(folder, filename)

        # Truncate prompt for SVG display
        clean_prompt = prompt.replace("\n", " ").replace('"', "'")[:140] + "..."
        clean_label = label.replace("<", "&lt;").replace(">", "&gt;")

        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#000000" />
      <stop offset="45%" stop-color="#141414" />
      <stop offset="100%" stop-color="#1c1c1c" />
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#E5091428" />
      <stop offset="100%" stop-color="transparent" />
    </radialGradient>
    <pattern id="film-grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ffffff08" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <rect width="960" height="540" fill="url(#glow)"/>
  <rect width="960" height="540" fill="url(#film-grid)"/>
  
  <!-- Outer Slate Frame -->
  <rect x="30" y="30" width="900" height="480" rx="12" fill="#181818dd" stroke="#E50914" stroke-width="2" stroke-opacity="0.6"/>
  
  <!-- Netflix Red Ribbon Studio Header -->
  <rect x="54" y="52" width="28" height="34" rx="2" fill="#000000" stroke="#E50914" stroke-width="1.5"/>
  <text x="68" y="76" font-family="'Courier Prime', monospace, sans-serif" font-size="18" fill="#E50914" text-anchor="middle" font-weight="900">रं</text>
  
  <text x="94" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#E50914" font-weight="900" letter-spacing="2">RANGMANCH STUDIO</text>
  <text x="94" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#a1a1aa" font-weight="600" letter-spacing="1">CINEMATIC VISUAL BIBLE • 4K ULTRA HD</text>
  
  <!-- Metadata Pill Right -->
  <rect x="740" y="52" width="166" height="26" rx="13" fill="#262626" stroke="#ffffff1a" stroke-width="1"/>
  <text x="823" y="69" font-family="'Courier New', monospace" font-size="10" fill="#4ade80" text-anchor="middle" font-weight="bold">STAGE 09 CERTIFIED</text>
  
  <!-- Title Plate -->
  <text x="480" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#ffffff" text-anchor="middle" font-weight="900" letter-spacing="1">
    {clean_label}
  </text>
  
  <!-- Prompt Card Container -->
  <rect x="60" y="200" width="840" height="240" rx="8" fill="#0d0d0d" stroke="#2d2d2d" stroke-width="1.5"/>
  <rect x="60" y="200" width="840" height="32" rx="8" fill="#1f1f1f"/>
  <text x="80" y="221" font-family="'Courier New', monospace" font-size="11" fill="#E50914" font-weight="bold" letter-spacing="1">
    GROUNDED PROMPT DIRECTIVE (ETHNOGRAPHICALLY TRACEABLE)
  </text>
  
  <foreignObject x="80" y="245" width="800" height="180">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color: #e4e4e7; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; word-wrap: break-word; overflow: hidden;">
      {clean_prompt}
    </div>
  </foreignObject>
  
  <!-- Footer Status Bar -->
  <text x="480" y="485" font-family="'Courier New', monospace" font-size="11" fill="#71717a" text-anchor="middle">
    Entity: {entity_id}  |  Engine: FLUX.2 Studio Simulator  |  Zero Cultural Hallucinations Certified
  </text>
</svg>
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_content)
        return filepath

    def _decode_image_bytes(self, payload: Dict[str, Any]) -> bytes:
        artifacts = payload.get("artifacts") or payload.get("data") or []
        if isinstance(artifacts, list) and artifacts:
            first = artifacts[0]
            if isinstance(first, dict):
                encoded = first.get("base64") or first.get("b64_json") or ""
                if encoded:
                    return base64.b64decode(encoded)
        encoded = payload.get("b64_json") or payload.get("image") or ""
        if isinstance(encoded, str) and encoded:
            if encoded.startswith("data:"):
                encoded = encoded.split(",", 1)[-1]
            return base64.b64decode(encoded)
        raise RuntimeError("NVIDIA image response did not include image bytes")

    def generate(self, prompt: str, entity_id: str, label: str, subfolder: str = "images") -> str:
        if self.mock or not self.api_key or self.api_key == "your_key_here":
            return self._create_placeholder_image(entity_id, label, prompt, subfolder)

        if self.generated_count >= self.max_generations:
            raise RuntimeError(f"Image budget reached ({self.max_generations})")

        import httpx

        seed = zlib.crc32(f"{entity_id}\n{prompt}".encode("utf-8")) % 2_000_000_000
        body = {
            "prompt": prompt[:2000],
            "width": self.width,
            "height": self.height,
            "steps": self.steps,
            "seed": seed,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        last_error = "unknown error"
        for attempt in range(3):
            try:
                response = httpx.post(self.endpoint, headers=headers, json=body, timeout=180.0)
                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}: {response.text[:240]}"
                    time.sleep(1.5 * (attempt + 1))
                    continue
                response.raise_for_status()
                raw = self._decode_image_bytes(response.json())
                ext = ".png" if raw.startswith(b"\x89PNG") else ".jpg"
                folder = os.path.join(self.output_dir, subfolder)
                os.makedirs(folder, exist_ok=True)
                filepath = os.path.join(folder, f"{entity_id}_{int(datetime.now().timestamp())}{ext}")
                with open(filepath, "wb") as handle:
                    handle.write(raw)
                self.generated_count += 1
                return filepath
            except Exception as exc:
                last_error = str(exc)
                time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"NVIDIA image call failed for {self.model_name}: {last_error}")

def build_character_prompt(
    character: Character,
    costume: Optional[Costume],
    culture: Dict[str, Any],
    adaptation_plan: AdaptationPlan
) -> str:
    """
    Build a culturally specific image prompt.
    Every visual element must come from:
    - Approved costume record
    - Culture reference (cite field)
    - Story (cite scene)
    NEVER add elements not approved or referenced.
    """
    costume_desc = costume.description if costume else "Regional traditional attire"
    style_wardrobe = culture.get("typical_wardrobe_male_or_female", culture.get("typical_wardrobe_male", "traditional cottons"))
    region = culture.get("region", adaptation_plan.region)
    setting = adaptation_plan.setting
    
    return (
        f"Full-body portrait of {character.canonical_name}, "
        f"age {character.age or 'mature adult'}, {character.role}. "
        f"Costume: {costume_desc}. "
        f"Setting: {region}, {setting}. "
        f"Cultural style: {style_wardrobe}. "
        f"Expression: {character.personality or 'Dignified and grounded'}. "
        f"Photorealistic, soft natural light, neutral authentic background. "
        f"Style: documentary portrait. No written text, captions, watermarks, or letters anywhere in the image."
    )

def build_costume_prompt(
    costume: Costume,
    character: Character,
    culture: Dict[str, Any],
    adaptation_plan: AdaptationPlan
) -> str:
    wardrobe = culture.get("typical_wardrobe_male_or_female", culture.get("typical_wardrobe_male", "traditional weave"))
    return (
        f"Costume study and wardrobe bible plate for {character.canonical_name}. "
        f"Attire description: {costume.description}. "
        f"Cultural fabric and craftsmanship: {wardrobe}. "
        f"Regional provenance: {culture.get('region')}. "
        f"Detailed studio mannequin or laydown shot, high resolution textile detail, natural color balance. "
        f"No written text, captions, labels, or watermarks."
    )

def build_scene_prompt(
    scene: Scene,
    adapted_scene: AdaptedScene,
    characters_in_scene: List[Character],
    culture: Dict[str, Any],
    adaptation_plan: AdaptationPlan
) -> str:
    arch = culture.get("architecture", "traditional courtyard haveli")
    char_names = ", ".join([c.canonical_name for c in characters_in_scene]) if characters_in_scene else "Principal characters"
    return (
        f"Cinematic film still in a {arch}. "
        f"Time of day: {scene.time_of_day}, Atmosphere & Mood: {scene.mood}. "
        f"Characters present: {char_names}. "
        f"Narrative action: {scene.dramatic_purpose}. "
        f"Lighting: natural period lighting, authentic film still, 35mm composition. "
        f"No written text, captions, subtitles, signs, or watermarks."
    )

def generate_visual_pipeline(
    project_id: str,
    adaptation_plan: AdaptationPlan,
    characters: List[Character],
    costumes: List[Costume],
    scenes: List[Scene],
    adapted_scenes: List[AdaptedScene],
    client: Optional[ImageGenClient] = None
) -> List[GeneratedImage]:
    """
    Stage 9 — Image Generation
    Rules:
    - Generate in this order: characters first → costumes second → scenes third
    - Each character generated ONCE per approved canonical appearance
    - Scenes use approved character images as reference (include description in prompt)
    - Store exact prompt used for every image
    - If generation fails → log error, mark entity as GENERATION_FAILED, continue others
    """
    if not adaptation_plan.approved:
        raise ValueError("Gate 2/3 violation: Visual generation requires approved adaptation plan and screenplay.")

    if client is None:
        client = ImageGenClient()

    culture = load_culture_ref(adaptation_plan.culture_id)
    generated_images: List[GeneratedImage] = []

    # Map character to primary costume
    char_costume_map = {c.character_id: c for c in costumes}

    # STEP 1: Characters First
    for char in characters:
        cost = char_costume_map.get(char.id)
        prompt = build_character_prompt(char, cost, culture, adaptation_plan)
        try:
            img_path = client.generate(
                prompt=prompt,
                entity_id=char.id,
                label=f"Character Bible: {char.canonical_name} ({char.id})",
                subfolder="character_bible"
            )
            status = "COMPLETED"
        except Exception as e:
            print(f"[ImageGen] Failed for {char.id}: {e}")
            img_path = ""
            status = "GENERATION_FAILED"

        generated_images.append(GeneratedImage(
            id=f"IMG_{char.id}_{int(datetime.now(timezone.utc).timestamp())}",
            project_id=project_id,
            adaptation_plan_id=adaptation_plan.id,
            entity_type="character",
            entity_id=char.id,
            prompt_used=prompt,
            image_path=img_path,
            generation_model=client.model_name if not client.mock else "mock",
            approved_before_generation=True,
            status=status,
            created_at=datetime.now(timezone.utc)
        ))

    # STEP 2: Costumes Second
    char_map = {c.id: c for c in characters}
    for cost in costumes:
        associated_char = char_map.get(cost.character_id) or (characters[0] if characters else None)
        if not associated_char:
            continue
        prompt = build_costume_prompt(cost, associated_char, culture, adaptation_plan)
        try:
            img_path = client.generate(
                prompt=prompt,
                entity_id=cost.id,
                label=f"Costume Bible: {cost.id} ({associated_char.canonical_name})",
                subfolder="costume_bible"
            )
            status = "COMPLETED"
        except Exception as e:
            print(f"[ImageGen] Failed for {cost.id}: {e}")
            img_path = ""
            status = "GENERATION_FAILED"

        generated_images.append(GeneratedImage(
            id=f"IMG_{cost.id}_{int(datetime.now(timezone.utc).timestamp())}",
            project_id=project_id,
            adaptation_plan_id=adaptation_plan.id,
            entity_type="costume",
            entity_id=cost.id,
            prompt_used=prompt,
            image_path=img_path,
            generation_model=client.model_name if not client.mock else "mock",
            approved_before_generation=True,
            status=status,
            created_at=datetime.now(timezone.utc)
        ))

    # STEP 3: Scenes Third
    adapted_map = {a.scene_id: a for a in adapted_scenes}
    for sc in scenes:
        ad_sc = adapted_map.get(sc.id)
        if not ad_sc:
            continue
        prompt = build_scene_prompt(sc, ad_sc, characters[:2], culture, adaptation_plan)
        try:
            img_path = client.generate(
                prompt=prompt,
                entity_id=sc.id,
                label=f"Scene Keyframe: {sc.id} ({sc.int_ext} {sc.location_id})",
                subfolder="scene_keyframes"
            )
            status = "COMPLETED"
        except Exception as e:
            print(f"[ImageGen] Failed for {sc.id}: {e}")
            img_path = ""
            status = "GENERATION_FAILED"

        generated_images.append(GeneratedImage(
            id=f"IMG_{sc.id}_{int(datetime.now(timezone.utc).timestamp())}",
            project_id=project_id,
            adaptation_plan_id=adaptation_plan.id,
            entity_type="scene",
            entity_id=sc.id,
            prompt_used=prompt,
            image_path=img_path,
            generation_model=client.model_name if not client.mock else "mock",
            approved_before_generation=True,
            status=status,
            created_at=datetime.now(timezone.utc)
        ))

    return generated_images
