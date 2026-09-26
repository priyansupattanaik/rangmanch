# RANGMANCH (रंगमंच) — Architecture

"The Stage" — Where Stories Become Culture

## Overview
RANGMANCH is an end-to-end AI-assisted screenplay cultural adaptation platform. It translates dramatic screenplays across regional cultural contexts (dialects, kinship terms, architecture, wardrobe, food, honorifics, idioms) while enforcing strict anti-hallucination protocols, human review gates, and continuity verification.

## Core Anti-Hallucination Philosophy
1. **Curated Reference Grounding**: Every cultural decision must explicitly cite a field in `backend/cultural_ref/cultures.json`.
2. **Confidence Demotion**: If a cultural fact is missing or uncertain, the engine flags `{ "confidence": "LOW", "decision": "HUMAN_REVIEW", "reason": "Cultural knowledge not found in reference" }`.
3. **No Cross-Contamination**: Multi-culture adaptations use isolated, unshared state.
4. **Mandatory Human Review Gates**:
   - **Gate 1 (/review)**: Entities, scene extraction, alias clusters, props, continuity.
   - **Gate 2 (/plan)**: Adaptation decision table and evidence grounding.
   - **Gate 3 (/adapt)**: Side-by-side screenplay diff and verification reports before visual generation.

## System Components

### Backend (FastAPI + SQLModel + SQLite)
- **`models/`**: SQLModel entities for `Project`, `Scene`, `Location`, `Character`, `Costume`, `Prop`, `AdaptationPlan`, `AdaptedScene`, and `GeneratedImage`.
- **`services/extractor.py`**: Deterministic INT./EXT. scene extraction, prop and character mention capture, LLM-assisted mood and dramatic purpose classification.
- **`services/normalizer.py`**: Alias clustering, candidate merge flagging, canonical ID assignment (`CHAR_001`, `LOC_001`, `PROP_001`, `COST_001`).
- **`services/planner.py`**: Strict cultural adaptation planner referencing `cultures.json`.
- **`services/adapter.py`**: Scene-by-scene dialogue rewriter using approved decisions only.
- **`services/verifier.py`**: Independent 7-point validation suite (dramatic purpose, relationship dynamics, prop chain, costume continuity, cultural isolation, reference grounding, reading speed).
- **`services/image_gen.py`**: NVIDIA FLUX.2 Klein / mock image pipeline with budget guards and prompt traceability.
- **`cultural_ref/cultures.json`**: Ground truth cultural database covering Malwai, Mewari, and Majhi traditions.

### Frontend (Next.js 14 App Router + Tailwind CSS + Zustand)
- **`/`**: Screenplay upload (text/file) and regional culture selection.
- **`/review`**: Gate 1 review interface for scenes, characters, alias merges, props, and initial continuity checks.
- **`/plan`**: Gate 2 review interface for decision tables with evidence verification and confidence indicators.
- **`/adapt`**: Gate 3 side-by-side screenplay viewer, live diff highlighting, verification status badges, and human review queue.
- **`/gallery`**: Visual asset browser for generated character bibles, costume bibles, and scene keyframes.
- **`/export`**: Export hub for ZIP bundles, screenplay markdown, JSON reports, and visual bibles.
