import os
import re
import json
import time
import hashlib
from typing import Any, Dict, Optional

from services.envload import load_project_env

load_project_env()

ANTI_HALLUCINATION_INSTRUCTION = """
IMPORTANT: You are working with a curated cultural reference.
- Only use cultural facts present in the CULTURE REFERENCE provided above.
- If you need a cultural fact not in the reference, write: 
  UNCERTAIN: [what you need] instead of inventing it.
- Do not use your general training knowledge about Indian cultures 
  unless it matches what is in the provided reference.
- A confident wrong answer is worse than an honest "I don't know".
- Dramaturgy of the supplied scene (mood, purpose, emotional change, whether the adaptation still performs that purpose) is required. Do not mark those UNCERTAIN when the scene text is present.
- When the user asks for JSON, return one JSON object and no markdown fences.
"""

DEFAULT_WRITER_MODEL = "nvidia/nemotron-3-super-120b-a12b"
DEFAULT_VERIFIER_MODEL = "mistralai/mistral-nemotron"
NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


def _is_json(text: str) -> bool:
    try:
        json.loads(text)
        return True
    except Exception:
        return False


def coerce_model_text(text: str) -> str:
    """Strip reasoning wrappers and markdown fences so callers can json.loads the body."""
    cleaned = (text or "").strip()
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL | re.IGNORECASE).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    if cleaned.startswith("{") or cleaned.startswith("["):
        return cleaned
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        return match.group(0).strip()
    return cleaned


class LLMClient:
    def __init__(self, mock: Optional[bool] = None, model: Optional[str] = None, role: str = "writer"):
        if mock is None:
            self.mock = os.getenv("LLM_MOCK", "true").lower() in ("true", "1", "yes")
        else:
            self.mock = mock
        self.role = role
        if model:
            self.model = model
        elif role == "verifier":
            self.model = os.getenv("LLM_VERIFIER_MODEL", DEFAULT_VERIFIER_MODEL)
        else:
            self.model = os.getenv("LLM_MODEL", DEFAULT_WRITER_MODEL)
        self.api_key = os.getenv("NVIDIA_API_KEY", "")
        self.base_url = os.getenv("NVIDIA_CHAT_URL", NVIDIA_CHAT_URL)
        self.temperature = 0.1 if role == "verifier" else 0.2

    def hash_prompt(self, prompt: str) -> str:
        return hashlib.sha256(prompt.strip().encode("utf-8")).hexdigest()[:16]

    def call(self, prompt: str, system_context: str = "", _repair: bool = False) -> str:
        if self.mock or not self.api_key or self.api_key == "your_key_here":
            return self._mock_call(prompt, system_context)
        text = self._call_nvidia(prompt, system_context)
        if not _repair and "json" in prompt.lower() and not _is_json(text):
            repaired = self.call(
                "Return only one valid JSON object for the task below. No markdown, no commentary.\n\n"
                f"TASK:\n{prompt[:6000]}\n\nDRAFT THAT FAILED TO PARSE:\n{text[:4000]}",
                system_context,
                _repair=True,
            )
            if _is_json(repaired):
                return repaired
        return text

    def _call_nvidia(self, prompt: str, system_context: str) -> str:
        import httpx

        system_prompt = (system_context + "\n" + ANTI_HALLUCINATION_INSTRUCTION).strip()
        payload: Dict[str, Any] = {
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": 4096,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        }
        if self.model.startswith("nvidia/nemotron"):
            payload["chat_template_kwargs"] = {"enable_thinking": False}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        last_error = "unknown error"
        for attempt in range(3):
            try:
                response = httpx.post(self.base_url, headers=headers, json=payload, timeout=180.0)
                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}: {response.text[:300]}"
                    time.sleep(1.5 * (attempt + 1))
                    continue
                response.raise_for_status()
                data = response.json()
                message = data["choices"][0]["message"]
                content = message.get("content") or ""
                if isinstance(content, list):
                    content = "".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in content
                    )
                text = coerce_model_text(content)
                if not text:
                    last_error = "empty model content"
                    time.sleep(1.0)
                    continue
                return text
            except Exception as exc:
                last_error = str(exc)
                time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"NVIDIA chat call failed for {self.model}: {last_error}")

    def _mock_call(self, prompt: str, system_context: str) -> str:
        prompt_lower = prompt.lower()

        if "dramatic_purpose" in prompt_lower or "mood" in prompt_lower:
            mood = "Tense & Dramatic"
            purpose = "Establish conflict between generational traditions and individual duty"
            if "courtyard" in prompt_lower or "morning" in prompt_lower:
                mood = "Solemn / Reflective"
                purpose = "Establish the patriarch's authority and household hierarchy"
            elif "night" in prompt_lower or "secret" in prompt_lower:
                mood = "Conspiratorial / High Tension"
                purpose = "Reveal hidden intentions and test family loyalty"

            return json.dumps({
                "mood": mood,
                "dramatic_purpose": purpose,
                "emotional_change": "From passive hesitation to solemn confrontation"
            }, indent=2)

        if "rewrite the dialogue" in prompt_lower or "task:\nrewrite" in prompt_lower:
            culture_id = "malwai"
            if "mewari" in prompt_lower:
                culture_id = "mewari"
            elif "majhi" in prompt_lower:
                culture_id = "majhi"

            if culture_id == "malwai":
                adapted_text = (
                    "INT. HAVELI COURTYARD - MORNING\n\n"
                    "The neem tree casts patterned shadows over the open aangan.\n\n"
                    "BADA KUNWAR AMAR\n"
                    "(bowing head respectfully)\n"
                    "Ram Ram sa, Bapuji. This letter arrived at the otla threshold today.\n\n"
                    "BAPUJI RAM SINGH\n"
                    "(gravely)\n"
                    "Keep it on the wooden chowki, bhaiya sa. In Malwa, we do not read haste into family honour."
                )
                changes = [
                    {
                        "original": "Good morning, father.",
                        "adapted": "Ram Ram sa, Bapuji.",
                        "decision_id": "DEC_GREETING_01",
                        "confidence": "HIGH"
                    },
                    {
                        "original": "Brother",
                        "adapted": "bhaiya sa",
                        "decision_id": "DEC_KINSHIP_01",
                        "confidence": "HIGH"
                    }
                ]
            elif culture_id == "mewari":
                adapted_text = (
                    "INT. WHITE STONE HAVELI - MORNING\n\n"
                    "Sunlight filters through the intricately carved jharokha.\n\n"
                    "KUNWAR AMAR SINGH\n"
                    "(touching feet)\n"
                    "Khamma Ghani, Daata. The messenger delivered this dispatch before the dawn prayers.\n\n"
                    "DAATA THAKUR SAHIB\n"
                    "(steadfast)\n"
                    "Place it before the tulsi vrindavan, banna sa. Mewar ra mard kadi jhukya koni."
                )
                changes = [
                    {
                        "original": "Good morning, father.",
                        "adapted": "Khamma Ghani, Daata.",
                        "decision_id": "DEC_GREETING_01",
                        "confidence": "HIGH"
                    },
                    {
                        "original": "Son",
                        "adapted": "banna sa",
                        "decision_id": "DEC_KINSHIP_01",
                        "confidence": "HIGH"
                    }
                ]
            else:
                adapted_text = (
                    "INT. ANCESTRAL KOTHI DEORHI - MORNING\n\n"
                    "Vibrant phulkari tapestries frame the grand deorhi entrance.\n\n"
                    "SARDAR AMAR SINGH\n"
                    "(with deep respect)\n"
                    "Sat Sri Akal, Bapu ji. The courier left this urgent envelope at our baithak.\n\n"
                    "BAPU HARBHAJAN SINGH\n"
                    "(smiling warmly)\n"
                    "Keep it on the charpai, veera. Jithe chah uthe rah."
                )
                changes = [
                    {
                        "original": "Good morning, father.",
                        "adapted": "Sat Sri Akal, Bapu ji.",
                        "decision_id": "DEC_GREETING_01",
                        "confidence": "HIGH"
                    },
                    {
                        "original": "Brother / Son",
                        "adapted": "veera",
                        "decision_id": "DEC_KINSHIP_01",
                        "confidence": "HIGH"
                    }
                ]

            return json.dumps({
                "adapted_dialogue": adapted_text,
                "changes": changes,
                "review_items": []
            }, indent=2)

        if "does this scene still achieve" in prompt_lower:
            return json.dumps({
                "passed": True,
                "reason": "The core dramatic purpose and conflict are faithfully preserved in the regional adaptation."
            })

        return json.dumps({
            "confidence": "HIGH",
            "message": "Processed successfully according to reference guidelines."
        })
