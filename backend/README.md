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
- **AI Integration**: NVIDIA NIM — Nemotron 3 Super for adaptation, Mistral Nemotron for verification, and FLUX.2 Klein for images. Mock providers remain for tests.

---

## Quickstart

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
pnpm install
pnpm dev
```
Open `http://localhost:3000` to access the application.

---

## Testing
Run backend test suite:
```bash
cd backend
pytest -v
```
