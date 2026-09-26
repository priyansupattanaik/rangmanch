# RANGMANCH (रंगमंच)
> *"The Stage" — Where Stories Become Culture*

RANGMANCH is a specialized cultural adaptation engine for dramatic screenplays. It adapts dialogues, character dynamics, props, wardrobe, and scene aesthetics into authentic regional Indian traditions (such as Malwai, Mewari, and Majhi) while guaranteeing zero ungrounded cultural hallucination.

---

## Key Features

- **Strict Anti-Hallucination Pipeline**: Every adaptation decision references grounded cultural data in `cultures.json`. Missing knowledge defaults to `LOW` confidence and requires human review.
- **Three Human Review Gates**:
  - **Gate 1 (`/review`)**: Entity resolution & alias confirmation.
  - **Gate 2 (`/plan`)**: Cultural adaptation decision audit & override.
  - **Gate 3 (`/adapt`)**: Screenplay side-by-side verification before visual generation.
- **7-Point Independent Verifier**:
  1. Dramatic purpose preservation
  2. Character relationship consistency
  3. Prop continuity chains
  4. Costume continuity
  5. Cultural isolation (no dialect cross-mixing)
  6. Cultural fact grounding check
  7. Dialogue reading speed calculation for subtitles
- **Visual Bible Generation**: Character, costume, and scene plates from NVIDIA-hosted FLUX.2 Klein, locked behind the human gates, with a mock provider for offline runs.
- **Complete Packaging**: Export adapted screenplays, continuity reports, scene breakdowns, and character/costume bibles as a clean ZIP package.

---

## Tech Stack

- **Backend**: FastAPI, SQLModel, SQLite, PyMuPDF (fitz), python-docx, Pydantic v2
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Zustand
- **AI Integration**: NVIDIA NIM — `nvidia/nemotron-3-super-120b-a12b` for extraction and adaptation, `mistralai/mistral-nemotron` for independent verification, and `black-forest-labs/flux.2-klein-4b` for images. Mock providers remain for tests.

---

## Quickstart

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Run Both Backend & Frontend with One Command
From the root directory (`d:\My Creations\rangmanch`):
```bash
npm run dev
# or
pnpm dev
# or on Windows:
.\dev.bat
```
This automatically starts:
- **FastAPI Backend**: `http://localhost:8000` (docs at `http://localhost:8000/docs`)
- **Next.js Frontend**: `http://localhost:3000`

---

### Alternative: Manual Setup

#### Backend Setup
```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

#### Frontend Setup
```bash
cd frontend
pnpm dev
```


---

## Testing
Run backend test suite:
```bash
cd backend
pytest -v
```
