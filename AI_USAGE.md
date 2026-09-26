# AI Usage in RANGMANCH

## Model Configuration & Usage Guidelines

### 1. Large Language Models (LLM)
- **Primary Model**: NVIDIA NIM chat at `https://integrate.api.nvidia.com/v1/chat/completions`.
  - Writer (extraction and adaptation): `nvidia/nemotron-3-super-120b-a12b`.
  - Independent verifier: `mistralai/mistral-nemotron` (a different model on the same NVIDIA endpoint, so the judge is not the writer).
- **Credentials**: `NVIDIA_API_KEY` from [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys), stored in gitignored `.env.local`.
- **Execution Strategy**:
  - Deterministic tasks (scene splitting, mention extraction, alias clustering, schema validation) are performed via Python rule engines without LLM dependencies.
  - Per-scene calls are isolated:
    1. Scene extraction analysis (extracting `mood`, `dramatic_purpose`, `emotional_change`).
    2. Scene adaptation (`services/adapter.py`) using only approved decisions from Gate 2.
    3. Verification (`services/verifier.py`) runs independently using separate prompts to judge dramatic fidelity and relationship continuity.
- **Mock/Replay Mode**: Built-in deterministic mock provider (`LLM_MOCK=true`) for reproducible offline testing, continuous integration, and rapid verification without API spend.

### 2. Image Generation
- **Primary Engine**: NVIDIA-hosted FLUX.2 Klein (`black-forest-labs/flux.2-klein-4b`) at `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b`.
- **Generation Order**: Characters -> Costumes -> Scene Keyframes.
- **Safety & Gate**: Image generation APIs are strictly locked until human approval is recorded in Gate 3 (`/adapt`).
- **Traceability**: Every generated image stores the full prompt, entity reference ID, and timestamp in SQLite.
- **Mock Provider**: Instant SVG/PNG canvas placeholder generation with entity and style labelling for zero-cost local development.
